cmake_minimum_required(VERSION 3.18)
project(myproj VERSION 1.0 LANGUAGES CXX)

# Disable Python support to avoid protoc-gen-mypy dependency
set(BUILD_PYTHON OFF CACHE BOOL "Disable Python bindings" FORCE)
set(BUILD_PYTHON_SAMPLES OFF CACHE BOOL "Disable Python samples" FORCE)
set(BUILD_PYTHON_EXAMPLES OFF CACHE BOOL "Disable Python examples" FORCE)

include(FetchContent)

# Disable ILP solvers we don't need - use correct OR-Tools variable names
set(USE_HIGHS OFF CACHE BOOL "Disable HiGHS solver")
set(USE_SCIP OFF CACHE BOOL "Disable SCIP solver")
set(USE_GUROBI OFF CACHE BOOL "Disable Gurobi solver")
set(USE_CPLEX OFF CACHE BOOL "Disable CPLEX solver")
set(USE_XPRESS OFF CACHE BOOL "Disable Xpress solver")
set(USE_GLPK OFF CACHE BOOL "Disable GLPK solver")
set(USE_COINOR OFF CACHE BOOL "Disable COIN-OR solvers")

# Also disable third-party solver support completely
set(OR_TOOLS_ENABLE_THIRD_PARTY_SOLVERS OFF CACHE BOOL "Disable all third-party solvers")

# First disable all testing globally, then re-enable only for our project
set(BUILD_TESTING OFF CACHE BOOL "Disable all testing globally")
set(BUILD_TESTS OFF CACHE BOOL "Disable all tests in OR-Tools")
set(BUILD_EXAMPLES OFF CACHE BOOL "Disable examples in OR-Tools")

# Disable OR-Tools testing completely to avoid fuzztest issues
set(OR_TOOLS_BUILD_TESTING OFF CACHE BOOL "Disable OR-Tools testing")
set(BUILD_TESTING_OR_TOOLS OFF CACHE BOOL "Disable OR-Tools internal tests")
set(OR_TOOLS_BUILD_TESTS OFF CACHE BOOL "Disable OR-Tools tests")
set(OR_TOOLS_ENABLE_TESTING OFF CACHE BOOL "Disable OR-Tools testing")

# Disable fuzztest to avoid dependency issues
set(USE_fuzztest OFF CACHE BOOL "Disable fuzztest")

# Skip system dependencies check to avoid fuzztest issue
set(OR_TOOLS_SKIP_SYSTEM_DEPS_CHECK ON CACHE BOOL "Skip system deps check")

# Build Abseil from source
set(BUILD_absl ON CACHE BOOL "Build Abseil from source")

# Build dependencies
set(BUILD_DEPS ON CACHE BOOL "Build dependencies")

# Build C++ library
set(BUILD_CXX ON CACHE BOOL "Build C++ library")

# Disable Python support to avoid Python dependency issues
set(BUILD_PYTHON OFF CACHE BOOL "Disable Python bindings")

# Fetch OR-Tools v9.14 (allow overrides for offline/local testing)
set(OR_TOOLS_GIT_REPOSITORY_DEFAULT "https://github.com/google/or-tools.git")
set(OR_TOOLS_GIT_REPOSITORY
    ${OR_TOOLS_GIT_REPOSITORY_DEFAULT}
    CACHE STRING "Git repository to use for OR-Tools")
set(OR_TOOLS_GIT_TAG_DEFAULT "v9.14")
set(OR_TOOLS_GIT_TAG
    ${OR_TOOLS_GIT_TAG_DEFAULT}
    CACHE STRING "Git tag/commit to use for OR-Tools")

FetchContent_Declare(
    or-tools
    GIT_REPOSITORY ${OR_TOOLS_GIT_REPOSITORY}
    GIT_TAG        ${OR_TOOLS_GIT_TAG}
    GIT_SHALLOW    TRUE
    GIT_PROGRESS   TRUE
)

FetchContent_GetProperties(or-tools)
if(NOT or-tools_POPULATED)
    message(STATUS "Fetching OR-Tools v9.14...")
    FetchContent_Populate(or-tools)
endif()

# Apply correct Gurobi filter patch
message(STATUS "Applying correct Gurobi filter patch to OR-Tools...")

# Apply the correct Gurobi filter patch file
set(PATCH_FILE ${CMAKE_CURRENT_SOURCE_DIR}/or-tools_patches/manual_working_gurobi_fix.patch)
if(EXISTS ${PATCH_FILE})
    execute_process(
        COMMAND git apply --check ${PATCH_FILE}
        WORKING_DIRECTORY ${or-tools_SOURCE_DIR}
        RESULT_VARIABLE PATCH_CHECK_RESULT
        OUTPUT_VARIABLE PATCH_CHECK_OUTPUT
        ERROR_VARIABLE PATCH_CHECK_ERROR
    )
    if(PATCH_CHECK_RESULT EQUAL 0)
        execute_process(
            COMMAND git apply ${PATCH_FILE}
            WORKING_DIRECTORY ${or-tools_SOURCE_DIR}
            RESULT_VARIABLE PATCH_RESULT
            OUTPUT_VARIABLE PATCH_OUTPUT
            ERROR_VARIABLE PATCH_ERROR
        )
        if(PATCH_RESULT EQUAL 0)
            message(STATUS "Successfully applied correct Gurobi filter patch")
        else()
            message(FATAL_ERROR "Failed to apply patch: ${PATCH_ERROR}")
        endif()
    else()
        execute_process(
            COMMAND git apply --reverse --check ${PATCH_FILE}
            WORKING_DIRECTORY ${or-tools_SOURCE_DIR}
            RESULT_VARIABLE PATCH_REVERSE_RESULT
            OUTPUT_VARIABLE PATCH_REVERSE_OUTPUT
            ERROR_VARIABLE PATCH_REVERSE_ERROR
        )
        if(PATCH_REVERSE_RESULT EQUAL 0)
            message(STATUS "Patch already applied")
        else()
            message(FATAL_ERROR
                    "Patch check failed:\n${PATCH_CHECK_ERROR}\n${PATCH_REVERSE_ERROR}")
        endif()
    endif()
else()
    message(FATAL_ERROR "Patch file not found: ${PATCH_FILE}")
endif()

# Add OR-Tools as subdirectory to build it
add_subdirectory(${or-tools_SOURCE_DIR} ${or-tools_BINARY_DIR})

add_executable(myapp main.cpp)
target_link_libraries(myapp ortools::ortools)

add_executable(rcpsp_solver rcpsp_solver.cpp)
target_link_libraries(rcpsp_solver ortools::ortools)

add_executable(driver driver.cpp)
target_link_libraries(driver ortools::ortools)
target_include_directories(driver PRIVATE ${or-tools_SOURCE_DIR})