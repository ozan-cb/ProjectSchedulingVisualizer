#include <iostream>
#include <fstream>
#include <chrono>
#include <sstream>
#include <vector>
#include <map>

// Hack to access private members for debugging
#define private public
#define protected public

#include "ortools/sat/cp_model.h"
#include "ortools/sat/cp_model.pb.h"
#include "ortools/sat/cp_model_solver.h"
#include "ortools/sat/cp_model_loader.h"
#include "ortools/sat/cp_model_mapping.h"
#include "ortools/sat/cp_model_solver_helpers.h"
#include "ortools/sat/model.h"
#include "ortools/sat/integer.h"

#undef private
#undef protected

using namespace operations_research;
using namespace sat;

// Event types for logging
enum class EventType {
  START_VAR_ASSIGNED,
  START_VAR_CHANGED,
  TASK_SCHEDULED,
  SEARCH_DECISION,
  BACKTRACK,
  CONFLICT
};

// Event structure for JSON serialization
struct Event {
  EventType type;
  int64_t timestamp;
  int task_id;
  std::string task_name;
  int64_t value;
  std::string description;
  int decision_level;
  int backtrack_to_level;
  std::string node_id;
  std::string parent_node_id;
  std::string node_status;
  std::vector<int> dependencies;
  std::vector<int> successors;

  std::string ToJson() const {
    std::ostringstream oss;
    oss << "{";
    oss << "\"id\":\"" << task_id << "_" << GetTypeString() << "_" << timestamp << "\",";
    oss << "\"type\":\"" << GetTypeString() << "\",";
    oss << "\"taskId\":\"" << task_id << "\",";
    oss << "\"taskName\":\"" << task_name << "\",";
    oss << "\"timestamp\":" << timestamp << ",";
    oss << "\"startTime\":" << value << ",";
    oss << "\"endTime\":" << (value + 3) << ",";
    oss << "\"decisionLevel\":" << decision_level << ",";
    oss << "\"backtrackToLevel\":" << backtrack_to_level << ",";
    oss << "\"nodeId\":\"" << node_id << "\",";
    oss << "\"parentNodeId\":\"" << parent_node_id << "\",";
    oss << "\"nodeStatus\":\"" << node_status << "\",";
    oss << "\"description\":\"" << description << "\",";
    oss << "\"dependencies\":[";
    for (size_t i = 0; i < dependencies.size(); ++i) {
      if (i > 0) oss << ",";
      oss << dependencies[i];
    }
    oss << "],";
    oss << "\"successors\":[";
    for (size_t i = 0; i < successors.size(); ++i) {
      if (i > 0) oss << ",";
      oss << successors[i];
    }
    oss << "]";
    oss << "}";
    return oss.str();
  }

private:
  std::string GetTypeString() const {
    switch (type) {
      case EventType::START_VAR_ASSIGNED: return "assign";
      case EventType::START_VAR_CHANGED: return "modify";
      case EventType::TASK_SCHEDULED: return "start";
      case EventType::SEARCH_DECISION: return "start";
      case EventType::BACKTRACK: return "remove";
      case EventType::CONFLICT: return "remove";
      default: return "unknown";
    }
  }
};

// Event logger that writes to JSON file
class EventLogger {
public:
  explicit EventLogger(const std::string& filename) 
      : filename_(filename), start_time_(std::chrono::steady_clock::now()) {
    file_.open(filename);
    if (file_.is_open()) {
      file_ << "{\n";
      file_ << "  \"version\": \"1.0\",\n";
      file_ << "  \"events\": [\n";
      first_event_ = true;
    }
  }

  ~EventLogger() {
    if (file_.is_open()) {
      file_ << "\n  ]\n";
      file_ << "}\n";
      file_.close();
    }
  }

  void LogEvent(const Event& event) {
    if (!file_.is_open()) return;

    if (!first_event_) {
      file_ << ",\n";
    } else {
      first_event_ = false;
    }

    file_ << "    " << event.ToJson();
    file_.flush();
  }

  void LogEvent(EventType type, int64_t timestamp, int task_id, const std::string& task_name,
                int64_t value, const std::string& description, int decision_level = 0,
                int backtrack_to_level = 0, const std::string& node_id = "",
                const std::string& parent_node_id = "", const std::string& node_status = "",
                const std::vector<int>& dependencies = {}, const std::vector<int>& successors = {}) {
    Event event;
    event.type = type;
    event.timestamp = timestamp;
    event.task_id = task_id;
    event.task_name = task_name;
    event.value = value;
    event.description = description;
    event.decision_level = decision_level;
    event.backtrack_to_level = backtrack_to_level;
    event.node_id = node_id;
    event.parent_node_id = parent_node_id;
    event.node_status = node_status;
    event.dependencies = dependencies;
    event.successors = successors;
    LogEvent(event);
  }

  int64_t GetTimestamp() const {
    auto now = std::chrono::steady_clock::now();
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        now - start_time_).count();
  }

private:
  std::string filename_;
  std::ofstream file_;
  std::chrono::steady_clock::time_point start_time_;
  bool first_event_;
};

// Custom propagator that watches start variables
class StartVariableWatcher : public PropagatorInterface {
public:
  StartVariableWatcher(const std::vector<IntegerVariable>& start_vars,
                      const std::vector<int>& task_ids,
                      const std::vector<std::string>& task_names,
                      IntegerTrail* integer_trail,
                      EventLogger* logger)
      : start_vars_(start_vars),
        task_ids_(task_ids),
        task_names_(task_names),
        integer_trail_(integer_trail),
        logger_(logger),
        decision_level_(0),
        max_decision_level_(0),
        current_node_id_(""),
        node_counter_(0) {
    CHECK(start_vars_.size() == task_ids_.size());
    CHECK(start_vars_.size() == task_names_.size());
    node_stack_.push_back("root");
  }

bool Propagate() override {
    static int call_count = 0;
    call_count++;
    if (call_count <= 10) {
      std::cout << "Propagate() called, count=" << call_count << std::endl;
    }

    // Check all start variables for changes
    for (size_t i = 0; i < start_vars_.size(); ++i) {
      IntegerVariable var = start_vars_[i];
      int task_id = task_ids_[i];
      std::string task_name = task_names_[i];

      // Get current bounds
      const IntegerValue lb = integer_trail_->LowerBound(var);
      const IntegerValue ub = integer_trail_->UpperBound(var);

      // Check if variable is fixed
      if (lb == ub) {
        int64_t value = lb.value();

        // Check if we've already logged this assignment
        auto it = logged_assignments_.find(task_id);
        if (it == logged_assignments_.end() || it->second != value) {
          // Check if this is a backtrack (assignment changed)
          if (it != logged_assignments_.end() && it->second != value) {
            // Backtrack occurred - find backtrack level
            int backtrack_to = 0;
            for (int j = node_stack_.size() - 1; j >= 0; --j) {
              if (node_stack_[j] == current_node_id_) {
                backtrack_to = j;
                break;
              }
            }

            decision_level_ = backtrack_to;

            // Pop nodes from stack (including current node)
            while (node_stack_.size() > backtrack_to) {
              node_stack_.pop_back();
            }

            // Get parent after popping
            std::string parent_id = node_stack_.empty() ? "root" : node_stack_.back();

            logger_->LogEvent(
              EventType::BACKTRACK,
              logger_->GetTimestamp(),
              task_id,
              task_name,
              it->second,
              "Backtracked from " + std::to_string(it->second) + " to " + std::to_string(value),
              decision_level_,
              backtrack_to,
              current_node_id_,
              parent_id,
              "pruned"
            );
          }

          // Check if this is a new task being decided
          bool is_new_task = (current_task_id_ != task_id);
          if (is_new_task) {
            decision_level_++;
            max_decision_level_ = std::max(max_decision_level_, decision_level_);
            current_task_id_ = task_id;
          }

          // New assignment - create new node
          std::string node_id = "node_" + std::to_string(node_counter_++);
          std::string parent_id = node_stack_.empty() ? "root" : node_stack_.back();

          parent_map_[node_id] = parent_id;
          node_stack_.push_back(node_id);
          current_node_id_ = node_id;

          logger_->LogEvent(
            EventType::START_VAR_ASSIGNED,
            logger_->GetTimestamp(),
            task_id,
            task_name,
            value,
            "Start variable fixed to " + std::to_string(value),
            decision_level_,
            0,
            node_id,
            parent_id,
            "created"
          );

          logger_->LogEvent(
            EventType::TASK_SCHEDULED,
            logger_->GetTimestamp(),
            task_id,
            task_name,
            value,
            "Task scheduled at time " + std::to_string(value),
            decision_level_,
            0,
            node_id,
            parent_id,
            "created"
          );

          logged_assignments_[task_id] = value;
        }
      } else {
        // Variable not fixed, log if bounds changed
        auto it = logged_bounds_.find(task_id);
        if (it == logged_bounds_.end() || it->second.first != lb.value() || it->second.second != ub.value()) {
          logged_bounds_[task_id] = {lb.value(), ub.value()};

          logger_->LogEvent(
            EventType::START_VAR_CHANGED,
            logger_->GetTimestamp(),
            task_id,
            task_name,
            lb.value(),
            "Start variable bounds updated: [" + std::to_string(lb.value()) + ", " + std::to_string(ub.value()) + "]",
            decision_level_,
            0,
            current_node_id_,
            node_stack_.empty() ? "" : node_stack_.back(),
            "created"
          );
        }
      }
    }

    return true;
  }

  bool IncrementalPropagate(const std::vector<int>& watch_indices) override {
    return Propagate();
  }

private:
  std::vector<IntegerVariable> start_vars_;
  std::vector<int> task_ids_;
  std::vector<std::string> task_names_;
  IntegerTrail* integer_trail_;
  EventLogger* logger_;

  // Track logged assignments to avoid duplicates
  std::map<int, int64_t> logged_assignments_;
  std::map<int, std::pair<int64_t, int64_t>> logged_bounds_;

  // Search tree tracking
  int decision_level_;
  int max_decision_level_;
  std::string current_node_id_;
  int current_task_id_;
  std::vector<std::string> node_stack_;
  std::map<std::string, std::string> parent_map_;
  int node_counter_;
};

// RCPSP instance structure
struct Task {
  int id;
  std::string name;
  int duration;
  std::vector<int> successors;
  std::vector<int> resource_demands;
};

struct Resource {
  int capacity;
};

struct RCPSPInstance {
  std::vector<Task> tasks;
  std::vector<Resource> resources;
  int horizon;
};

// Create simple RCPSP instance
RCPSPInstance CreateSimpleInstance() {
  RCPSPInstance instance;

  instance.tasks.resize(7);
  instance.resources.resize(2);

  instance.resources[0].capacity = 3;
  instance.resources[1].capacity = 2;

  // House renovation with parallel work streams
  // Foundation must be done first
  // Then Framing and Plumbing can work in parallel
  // Electrical follows Framing
  // Drywall needs both Plumbing and Electrical done
  // Painting and Flooring can work in parallel after Drywall
  instance.tasks[0] = {0, "Foundation", 3, {1, 2}, {2, 1}};
  instance.tasks[1] = {1, "Framing", 4, {3}, {1, 2}};
  instance.tasks[2] = {2, "Plumbing", 3, {4}, {2, 1}};
  instance.tasks[3] = {3, "Electrical", 4, {4}, {1, 1}};
  instance.tasks[4] = {4, "Drywall", 3, {5, 6}, {2, 1}};
  instance.tasks[5] = {5, "Painting", 3, {}, {1, 1}};
  instance.tasks[6] = {6, "Flooring", 4, {}, {2, 0}};

  instance.horizon = 25;

  return instance;
}

int main(int argc, char** argv) {
  std::string output_file = "events.json";
  if (argc > 1) {
    output_file = argv[1];
  }

  std::cout << "RCPSP Start Variable Watcher (Propagator)" << std::endl;
  std::cout << "Output file: " << output_file << std::endl;

  // Create event logger
  EventLogger logger(output_file);

  // Create RCPSP instance
  RCPSPInstance instance = CreateSimpleInstance();
  std::cout << "Created RCPSP instance with " << instance.tasks.size() << " tasks" << std::endl;

  // Build CP-SAT model
  CpModelBuilder cp_model;
  std::vector<IntervalVar> intervals;
  std::vector<IntegerVariable> start_vars;
  std::vector<int> task_ids;
  std::vector<std::string> task_names;
  
  // Create intervals for each task
  for (int i = 0; i < instance.tasks.size(); ++i) {
    const auto& task = instance.tasks[i];
    
    IntVar start = cp_model.NewIntVar({0, instance.horizon});
    IntVar duration = cp_model.NewConstant(task.duration);
    IntVar end = cp_model.NewIntVar({0, instance.horizon});
    
    IntervalVar interval = cp_model.NewIntervalVar(start, duration, end);
    intervals.push_back(interval);
    
    // Store task ID, name, and start variable
    task_ids.push_back(task.id);
    task_names.push_back(task.name);
    start_vars.push_back(IntegerVariable(start.index()));
  }
  
  // Compute predecessors (dependencies) for each task
  std::vector<std::vector<int>> predecessors(instance.tasks.size());
  for (int i = 0; i < instance.tasks.size(); ++i) {
    for (int succ : instance.tasks[i].successors) {
      predecessors[succ].push_back(i);
    }
  }
  
  // Log task definitions with dependencies
  for (int i = 0; i < instance.tasks.size(); ++i) {
    const auto& task = instance.tasks[i];
    logger.LogEvent(
      EventType::TASK_SCHEDULED,
      logger.GetTimestamp(),
      task.id,
      task.name,
      task.duration,
      "Task defined with duration " + std::to_string(task.duration),
      0,
      0,
      "",
      "",
      "",
      predecessors[i],
      task.successors
    );
  }
  
  std::cout << "Built model with " << start_vars.size() << " start variables" << std::endl;

  // Add precedence constraints
  for (int i = 0; i < instance.tasks.size(); ++i) {
    for (int succ : instance.tasks[i].successors) {
      cp_model.AddLessOrEqual(intervals[i].EndExpr(), intervals[succ].StartExpr());
    }
  }
  
  // Add cumulative resource constraints
  for (int r = 0; r < instance.resources.size(); ++r) {
    std::vector<IntervalVar> resource_intervals;
    std::vector<int64_t> demands;
    
    for (int i = 0; i < instance.tasks.size(); ++i) {
      if (instance.tasks[i].resource_demands[r] > 0) {
        resource_intervals.push_back(intervals[i]);
        demands.push_back(instance.tasks[i].resource_demands[r]);
      }
    }
    
    if (!resource_intervals.empty()) {
      auto cumulative = cp_model.AddCumulative(
          cp_model.NewConstant(instance.resources[r].capacity));
      for (size_t i = 0; i < resource_intervals.size(); ++i) {
        cumulative.AddDemand(resource_intervals[i], demands[i]);
      }
    }
  }
  
  // Minimize makespan
  IntVar makespan = cp_model.NewIntVar({0, instance.horizon});
  std::vector<LinearExpr> ends;
  for (const auto& interval : intervals) {
    ends.push_back(interval.EndExpr());
  }
  cp_model.AddMaxEquality(makespan, ends);
cp_model.Minimize(makespan);

  // Build the CpModelProto
  CpModelProto model_proto = cp_model.Build();
  std::cout << "Built CpModelProto with " << model_proto.variables_size() << " variables" << std::endl;
  
  // Add a search strategy to the model proto to configure search heuristics
  // This is required for SolveLoadedCpModel to work properly
  DecisionStrategyProto* strategy = model_proto.add_search_strategy();
  strategy->set_variable_selection_strategy(DecisionStrategyProto::CHOOSE_FIRST);
  strategy->set_domain_reduction_strategy(DecisionStrategyProto::SELECT_MIN_VALUE);
  
  // Add all start variables to the search strategy
  for (const IntegerVariable& var : start_vars) {
    strategy->add_variables(var.value());
  }

  std::cout << "Added search strategy with " << strategy->variables_size() << " variables" << std::endl;

  // Create Model for solver
  Model model;

  // Configure solver parameters BEFORE loading the model
  SatParameters parameters;
  parameters.set_max_time_in_seconds(30.0);
  parameters.set_num_search_workers(1);
  parameters.set_search_branching(SatParameters::PORTFOLIO_SEARCH);
  parameters.set_cp_model_presolve(false);
  parameters.set_enumerate_all_solutions(true);

  model.Add(NewSatParameters(parameters));

  model.GetOrCreate<SharedResponseManager>()->InitializeObjective(model_proto);
  std::cout << "Initialized objective" << std::endl;

  LoadCpModel(model_proto, &model);
  CpModelMapping* mapping = model.GetOrCreate<CpModelMapping>();
  std::cout << "Loaded full model into model" << std::endl;

  IntegerTrail* integer_trail = model.GetOrCreate<IntegerTrail>();
  GenericLiteralWatcher* watcher = model.GetOrCreate<GenericLiteralWatcher>();

  std::vector<IntegerVariable> solver_start_vars;
  for (const IntegerVariable& model_var : start_vars) {
    IntegerVariable solver_var = mapping->Integer(model_var.value());
    solver_start_vars.push_back(solver_var);
  }
  std::cout << "Converted " << solver_start_vars.size() << " variables to solver variables" << std::endl;

  StartVariableWatcher* start_watcher = new StartVariableWatcher(
    solver_start_vars,
    task_ids,
    task_names,
    integer_trail,
    &logger
  );

  const int propagator_id = watcher->Register(start_watcher);
  watcher->SetPropagatorId(propagator_id);

  for (const IntegerVariable& var : solver_start_vars) {
    watcher->WatchLowerBound(var, propagator_id);
    watcher->WatchUpperBound(var, propagator_id);
  }

  model.TakeOwnership(start_watcher);

  std::cout << "Registered start variable watcher with ID " << propagator_id << std::endl;
  std::cout << "Watching " << solver_start_vars.size() << " solver variables" << std::endl;

  logger.LogEvent({
    EventType::SEARCH_DECISION,
    logger.GetTimestamp(),
    -1,
    "Solver",
    0,
    "Solver started"
  });

  std::cout << "Starting solver..." << std::endl;
  SolveLoadedCpModel(model_proto, &model);

  SharedResponseManager* response_manager = model.GetOrCreate<SharedResponseManager>();
  const CpSolverResponse response = response_manager->GetResponse();

  std::cout << "Solver finished" << std::endl;
  std::cout << "Status: " << response.status() << std::endl;

  if (response.status() == CpSolverStatus::OPTIMAL || 
      response.status() == CpSolverStatus::FEASIBLE) {
    std::cout << "Objective value (makespan): " << response.objective_value() << std::endl;
    
    // Print solution
    std::cout << "\nSolution:" << std::endl;
    for (size_t i = 0; i < task_ids.size(); ++i) {
      int task_id = task_ids[i];
      int64_t start = response.solution(start_vars[i].value());
      int64_t end = start + instance.tasks[task_id].duration;
      std::cout << "  Task " << task_id << ": start=" << start << ", end=" << end << std::endl;
    }
  }

  std::cout << "\nEvents logged to: " << output_file << std::endl;

  return 0;
}