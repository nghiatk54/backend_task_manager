import Task from "../models/Task.js";

// @desc Get all tasks (Admin: all, User: assigned)
// @route Get /api/task
// @access Private
const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) {
      filter.status = status;
    }
    let tasks;
    if (req.user.role == "admin") {
      tasks = await Task.find(filter).populate(
        "assignedTo",
        "name email profileImageUrl"
      );
    } else {
      tasks = await Task.find({ ...filter, assignedTo: req.user._id }).populate(
        "assignedTo",
        "name email profileImageUrl"
      );
    }
    // add completed todoChecklist count to each task
    tasks = await Promise.all(
      tasks.map(async (task) => {
        const completedCount = task.todoChecklist.filter(
          (item) => item.completed
        ).length;
        return { ...task._doc, completedTodoCount: completedCount };
      })
    );
    // status summary counts
    const allTasks = await Task.countDocuments(
      req.user.role == "admin" ? {} : { assignedTo: req.user._id }
    );
    const pendingTasks = await Task.countDocuments({
      ...filter,
      status: "pending",
      ...(req.user.role != "admin" && { assignedTo: req.user._id }),
    });
    const inProgressTasks = await Task.countDocuments({
      ...filter,
      status: "in_progress",
      ...(req.user.role != "admin" && { assignedTo: req.user._id }),
    });
    const completedTasks = await Task.countDocuments({
      ...filter,
      status: "completed",
      ...(req.user.role != "admin" && { assignedTo: req.user._id }),
    });
    return res.status(200).json({
      message: "Tasks fetched successfully!",
      tasks,
      statusSummary: {
        all: allTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Get task by id
// @route Get /api/task/:id
// @access Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    );
    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }
    return res.status(200).json(task);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Create a task (Admin only)
// @route Post /api/task
// @access Private (Admin)
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body;
    if (!Array.isArray(assignedTo)) {
      return res
        .status(400)
        .json({ message: "assignedTo must be an array of user Ids!" });
    }
    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.user._id,
      todoChecklist,
      attachments,
    });
    return res.status(201).json({
      message: "Task created successfully!",
      task,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Update task details
// @route Put /api/task/:id
// @access Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }

    task.title = req.body.title || task.title;
    task.description = req.body.description || task.description;
    task.priority = req.body.priority || task.priority;
    task.dueDate = req.body.dueDate || task.dueDate;
    task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
    task.attachments = req.body.attachments || task.attachments;
    if (req.body.assignedTo) {
      if (!Array.isArray(req.body.assignedTo)) {
        return res
          .status(400)
          .json({ message: "assignedTo must be an array of user Ids!" });
      }
      task.assignedTo = req.body.assignedTo;
    }
    const updatedTask = await task.save();
    return res.status(200).json({
      message: "Task updated successfully!",
      updatedTask,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Delete a task (Admin only)
// @route Delete /api/task/:id
// @access Private (Admin)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }
    await task.deleteOne();
    return res.status(200).json({
      message: "Task deleted successfully!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Update task status
// @route Put /api/task/:id/status
// @access Private
const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }
    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user._id.toString()
    );
    if (!isAssigned && req.user.role != "admin") {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this task!" });
    }
    task.status = req.body.status || task.status;
    if (task.status == "completed") {
      task.todoChecklist.forEach((item) => {
        item.completed = true;
      });
      task.progress = 100;
    }
    await task.save();
    return res.status(200).json({
      message: "Task status updated successfully!",
      task,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Update task checklist
// @route Put /api/task/:id/todo
// @access Private
const updateTaskCheckList = async (req, res) => {
  try {
    const { todoChecklist } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }
    if (!task.assignedTo.includes(req.user._id) && req.user.role != "admin") {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this check list!" });
    }
    task.todoChecklist = todoChecklist; // Replace with updated check list
    // Auto update progress based on completed check list
    const completedCount = task.todoChecklist.filter(
      (item) => item.completed
    ).length;
    const totalItems = task.todoChecklist.length;
    task.progress =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
    // Auto mark task as completed if all items are completed
    if (task.progress == 100) {
      task.status = "completed";
    } else if (task.progress > 0) {
      task.status = "in_progress";
    } else {
      task.status = "pending";
    }
    await task.save();
    const updatedTask = await Task.findById(req.params.id).populate(
      "assignedTo",
      "name email profileImageUrl"
    );
    return res.status(200).json({
      message: "Task check list updated successfully!",
      task: updatedTask,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Get dashboard data (Admin only)
// @route Get /api/task/dashboard-data
// @access Private (Admin)
const getDashboardData = async (req, res) => {
  try {
    // fetch statistics
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "pending" });
    const completedTasks = await Task.countDocuments({ status: "completed" });
    const overdueTasks = await Task.countDocuments({
      status: { $ne: "completed" },
      dueDate: { $lt: new Date() },
    });
    // Ensure all possible statuses are included
    const taskStatuses = ["pending", "in_progress", "completed"];
    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, ""); // Remove spaces for response keys
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;
    // Ensure all possible priorities are included
    const taskPriorities = ["low", "medium", "high"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});
    // fetch recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    return res.status(200).json({
      message: "Dashboard data fetched successfully!",
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

// @desc Get user dashboard data (User only)
// @route Get /api/task/user-dashboard-data
// @access Private
const getUserDashboardData = async (req, res) => {
  try {
    const userId = req.user._id; // Only fetch data for the logged in user
    // fetch statistics for user-specific tasks
    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const pendingTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "pending",
    });
    const completedTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "completed",
    });
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: "completed" },
      dueDate: { $lt: new Date() },
    });
    // task distribution by status
    const taskStatuses = ["pending", "in_progress", "completed"];
    const taskDistributionRaw = await Task.aggregate([
      { $match: { assignedTo: userId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id == status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;
    // task distribution by priority
    const taskPriorities = ["low", "medium", "high"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      { $match: { assignedTo: userId } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id == priority)?.count || 0;
      return acc;
    }, {});
    // fetch recent 10 tasks for the logged in user
    const recentTasks = await Task.find({ assignedTo: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");
    return res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error!", error: error.message });
  }
};

export {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskCheckList,
  getDashboardData,
  getUserDashboardData,
};
