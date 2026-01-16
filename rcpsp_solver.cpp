#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <sstream>
#include "ortools/sat/cp_model.h"
#include "ortools/sat/cp_model.pb.h"
#include "ortools/sat/cp_model_solver.h"

using namespace operations_research;
using namespace sat;

struct Task {
    int id;
    int duration;
    std::vector<int> successors;
    std::vector<int> predecessors;
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

RCPSPInstance createSimpleInstance() {
    RCPSPInstance instance;
    
    instance.tasks.resize(5);
    instance.resources.resize(2);
    
    instance.resources[0].capacity = 3;
    instance.resources[1].capacity = 2;
    
    instance.tasks[0] = {0, 3, {1}, {}, {2, 1}};
    instance.tasks[1] = {1, 4, {2}, {0}, {1, 2}};
    instance.tasks[2] = {2, 2, {3}, {1}, {2, 1}};
    instance.tasks[3] = {3, 5, {4}, {2}, {1, 1}};
    instance.tasks[4] = {4, 3, {}, {3}, {2, 0}};
    
    instance.horizon = 20;
    
    return instance;
}

std::string solveRCPSP(const RCPSPInstance& instance) {
    CpModelBuilder model;
    
    std::vector<IntervalVar> intervals;
    
    for (int i = 0; i < instance.tasks.size(); ++i) {
        const auto& task = instance.tasks[i];
        IntVar start = model.NewIntVar({0, instance.horizon});
        IntVar duration = model.NewConstant(task.duration);
        IntVar end = model.NewIntVar({0, instance.horizon});
        
        IntervalVar interval = model.NewIntervalVar(start, duration, end);
        intervals.push_back(interval);
    }
    
    for (int i = 0; i < instance.tasks.size(); ++i) {
        for (int succ : instance.tasks[i].successors) {
            model.AddLessOrEqual(intervals[i].EndExpr(), intervals[succ].StartExpr());
        }
    }
    
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
            auto cumulative = model.AddCumulative(model.NewConstant(instance.resources[r].capacity));
            for (size_t i = 0; i < resource_intervals.size(); ++i) {
                cumulative.AddDemand(resource_intervals[i], demands[i]);
            }
        }
    }
    
    IntVar makespan = model.NewIntVar({0, instance.horizon});
    std::vector<LinearExpr> ends;
    for (const auto& interval : intervals) {
        ends.push_back(interval.EndExpr());
    }
    model.AddMaxEquality(makespan, ends);
    model.Minimize(makespan);
    
    const CpSolverResponse response = Solve(model.Build());
    
    std::cout << "Solver status: " << response.status() << std::endl;
    
    std::stringstream json;
    json << "{\n";
    json << "  \"events\": [\n";
    
    if (response.status() == CpSolverStatus::OPTIMAL || response.status() == CpSolverStatus::FEASIBLE) {
        std::cout << "Found feasible solution" << std::endl;
        for (int i = 0; i < instance.tasks.size(); ++i) {
            int64_t start = SolutionIntegerValue(response, intervals[i].StartExpr());
            int64_t end = SolutionIntegerValue(response, intervals[i].EndExpr());
            
            std::cout << "Task " << i << ": start=" << start << ", end=" << end << std::endl;
            
            json << "    {\"type\": \"start\", \"taskId\": " << i << ", \"time\": " << start << "},\n";
            json << "    {\"type\": \"complete\", \"taskId\": " << i << ", \"time\": " << end << "}";
            if (i < instance.tasks.size() - 1) json << ",";
            json << "\n";
        }
    } else {
        std::cout << "No feasible solution found" << std::endl;
    }
    
    json << "  ],\n";
    json << "  \"makespan\": " << SolutionIntegerValue(response, makespan) << "\n";
    json << "}\n";
    
    return json.str();
}

int main(int argc, char** argv) {
    std::string output_file = argc > 1 ? argv[1] : "output.json";
    
    RCPSPInstance instance = createSimpleInstance();
    
    std::cout << "Solving RCPSP instance with " << instance.tasks.size() << " tasks and " 
              << instance.resources.size() << " resources..." << std::endl;
    
    std::string json_output = solveRCPSP(instance);
    
    std::ofstream out(output_file);
    out << json_output;
    out.close();
    
    std::cout << "Solution written to " << output_file << std::endl;
    
    return 0;
}