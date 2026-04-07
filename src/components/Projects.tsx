'use client';

import { useState, useEffect } from 'react';
import { Project, ProjectStatus, Task } from '@/types';
import { getProjectsRemote, saveProject, deleteProject, generateId } from '@/lib/store';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { 
  ChevronDown, Plus, Trash2, GripVertical, List, LayoutGrid, 
  Edit2, X, Check, MoreHorizontal, FolderOpen
} from 'lucide-react';
import clsx from 'clsx';
import { useRef } from 'react';
import { format, parseISO } from 'date-fns';

const DEFAULT_STATUSES: ProjectStatus[] = [
  { id: 'todo', name: 'To Do', color: 'bg-gray-100' },
  { id: 'in-progress', name: 'In Progress', color: 'bg-blue-100' },
  { id: 'done', name: 'Done', color: 'bg-green-100' },
];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Project form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStartDate, setNewStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newEndDate, setNewEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newStatuses, setNewStatuses] = useState<ProjectStatus[]>(DEFAULT_STATUSES);
  const [newIsActive, setNewIsActive] = useState(true);

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskStatusId, setNewTaskStatusId] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const data = await getProjectsRemote();
    setProjects(data);
  };

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewStartDate('');
    setNewEndDate('');
    setNewStatuses(DEFAULT_STATUSES);
    setEditingProject(null);
  };

  const handleAddProject = async () => {
    if (!newName.trim()) return;
    const project: Project = {
      id: generateId(),
      name: newName,
      description: newDescription,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
      dateCreated: new Date().toISOString(),
      status: 'backlog',
      isActive: newIsActive,
      statuses: newStatuses,
      tasks: [],
    };
    saveProject(project);
    setProjects(await getProjectsRemote());
    setShowForm(false);
    resetForm();
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !newName.trim()) return;
    const updatedProject = {
      ...editingProject,
      name: newName,
      description: newDescription,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
      isActive: newIsActive,
      statuses: newStatuses,
    };
    saveProject(updatedProject);
    setProjects(await getProjectsRemote());
    setShowForm(false);
    setEditingProject(null);
    resetForm();
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setNewName(project.name);
    setNewDescription(project.description);
    setNewStartDate(project.startDate || '');
    setNewEndDate(project.endDate || '');
    setNewStatuses((project.statuses && project.statuses.length > 0) ? project.statuses : DEFAULT_STATUSES);
    setNewIsActive(project.isActive !== false);
    setShowForm(true);
  };

  const handleDeleteProject = async (id: string) => {
    deleteProject(id);
    setProjects(await getProjectsRemote());
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  const handleAddStatus = () => {
    const newStatus: ProjectStatus = {
      id: generateId(),
      name: 'New Status',
      color: 'bg-gray-100',
    };
    setNewStatuses([...newStatuses, newStatus]);
  };

  const handleUpdateStatus = (id: string, name: string) => {
    setNewStatuses(newStatuses.map(s => s.id === id ? { ...s, name } : s));
  };

  const handleDeleteStatus = (id: string) => {
    setNewStatuses(newStatuses.filter(s => s.id !== id));
  };

  // Task handlers
  const handleAddTask = async () => {
    if (!selectedProject || !newTaskName.trim()) return;
    const task: Task = {
      id: generateId(),
      name: newTaskName,
      description: newTaskDescription,
      statusId: newTaskStatusId || (selectedProject.statuses && selectedProject.statuses[0]?.id) || 'todo',
      createdAt: new Date().toISOString(),
    };
    const updatedProject = {
      ...selectedProject,
      tasks: [...(selectedProject.tasks || []), task],
    };
    saveProject(updatedProject);
    const refreshed = await getProjectsRemote();
    setProjects(refreshed);
    const updated = refreshed.find(p => p.id === selectedProject.id);
    if (updated) setSelectedProject(updated);
    setShowTaskForm(false);
    setNewTaskName('');
    setNewTaskDescription('');
  };

  const handleUpdateTask = async () => {
    if (!selectedProject || !editingTask || !newTaskName.trim()) return;
    const updatedProject = {
      ...selectedProject,
      tasks: (selectedProject.tasks || []).map(t => t.id === editingTask.id ? {
        ...t,
        name: newTaskName,
        description: newTaskDescription,
      } : t),
    };
    saveProject(updatedProject);
    const refreshed = await getProjectsRemote();
    setProjects(refreshed);
    const updated = refreshed.find(p => p.id === selectedProject.id);
    if (updated) setSelectedProject(updated);
    setShowTaskForm(false);
    setEditingTask(null);
    setNewTaskName('');
    setNewTaskDescription('');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedProject) return;
    const updatedProject = {
      ...selectedProject,
      tasks: (selectedProject.tasks || []).filter(t => t.id !== taskId),
    };
    saveProject(updatedProject);
    const refreshed = await getProjectsRemote();
    setProjects(refreshed);
    const updated = refreshed.find(p => p.id === selectedProject.id);
    if (updated) setSelectedProject(updated);
  };

  const handleMoveTask = async (taskId: string, newStatusId: string) => {
    if (!selectedProject) return;
    const updatedProject = {
      ...selectedProject,
      tasks: (selectedProject.tasks || []).map(t => 
        t.id === taskId ? { ...t, statusId: newStatusId } : t
      ),
    };
    saveProject(updatedProject);
    const refreshed = await getProjectsRemote();
    setProjects(refreshed);
    const updated = refreshed.find(p => p.id === selectedProject.id);
    if (updated) setSelectedProject(updated);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (statusId: string, statuses: ProjectStatus[]) => {
    const status = statuses.find(s => s.id === statusId);
    return status?.color || 'bg-gray-100';
  };

  const openProjectDetail = (project: Project) => {
    setSelectedProject(project);
  };

  return (
    <div className="animate-fade-in">
      {/* Project List / Detail View */}
      {!selectedProject ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
              <p className="text-sm text-gray-400 mt-1">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} /> Add Project
            </button>
          </div>

          {/* Project Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">{editingProject ? 'Edit Project' : 'New Project'}</h3>
                  <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 rounded hover:bg-gray-100">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Name</label>
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Project name"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  
<div>
                    <label className="text-xs text-gray-400 block mb-1">Description</label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Brief description..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={newIsActive}
                      onChange={(e) => setNewIsActive(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Active project</label>
                  </div>
                   
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={newStartDate}
                        onChange={(e) => setNewStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">End Date</label>
                      <input
                        type="date"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Statuses */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-400">Statuses</label>
                      <button onClick={handleAddStatus} className="text-xs text-blue-600 hover:underline">
                        + Add Status
                      </button>
                    </div>
                    <div className="space-y-2">
                      {newStatuses.map((status, idx) => (
                        <div key={status.id} className="flex items-center gap-2">
                          <div className={clsx('w-4 h-4 rounded', status.color)} />
                          <input
                            value={status.name}
                            onChange={(e) => handleUpdateStatus(status.id, e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                          {newStatuses.length > 1 && (
                            <button onClick={() => handleDeleteStatus(status.id)} className="text-gray-400 hover:text-red-500">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={editingProject ? handleUpdateProject : handleAddProject}
                    disabled={!newName.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
                  >
                    {editingProject ? 'Update Project' : 'Create Project'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="flex items-center justify-between mt-6">
            <h3 className="text-lg font-medium">Projects</h3>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
          </div>
          <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase">Name</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase">Description</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase">Start Date</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase">End Date</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase">Tasks</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase">Date Created</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-400 uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {projects.filter(p => p.isActive !== false || showInactive).map((project) => (
                  <tr key={project.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <button 
                        onClick={() => openProjectDetail(project)}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center gap-2"
                      >
                        <FolderOpen size={16} />
                        {project.name}
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${project.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {project.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{project.description || '-'}</td>
                    <td className="p-4 text-sm text-gray-500">{formatDate(project.startDate)}</td>
                    <td className="p-4 text-sm text-gray-500">{formatDate(project.endDate)}</td>
                    <td className="p-4">
                      <span className="text-sm text-gray-500">{(project.tasks || []).length}</span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{formatDate(project.dateCreated)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditProject(project)} className="p-1 text-gray-400 hover:text-blue-500">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteProject(project.id)} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-gray-400">
                      No projects yet. Click "Add Project" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Project Detail View with Tasks */
        <ProjectDetailView 
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          onTaskAdd={() => {
            setEditingTask(null);
            setNewTaskName('');
            setNewTaskDescription('');
            setNewTaskStatusId((selectedProject.statuses && selectedProject.statuses[0]?.id) || '');
            setShowTaskForm(true);
          }}
          onTaskEdit={(task) => {
            setEditingTask(task);
            setNewTaskName(task.name);
            setNewTaskDescription(task.description);
            setNewTaskStatusId(task.statusId);
            setShowTaskForm(true);
          }}
          onTaskDelete={handleDeleteTask}
          onTaskMove={handleMoveTask}
          showTaskForm={showTaskForm}
          newTaskName={newTaskName}
          setNewTaskName={setNewTaskName}
          newTaskDescription={newTaskDescription}
          setNewTaskDescription={setNewTaskDescription}
          newTaskStatusId={newTaskStatusId}
          setNewTaskStatusId={setNewTaskStatusId}
          handleAddTask={handleAddTask}
          handleUpdateTask={handleUpdateTask}
          closeTaskForm={() => { setShowTaskForm(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}

function ProjectDetailView({
  project,
  onBack,
  onTaskAdd,
  onTaskEdit,
  onTaskDelete,
  onTaskMove,
  showTaskForm,
  newTaskName,
  setNewTaskName,
  newTaskDescription,
  setNewTaskDescription,
  newTaskStatusId,
  setNewTaskStatusId,
  handleAddTask,
  handleUpdateTask,
  closeTaskForm,
}: {
  project: Project;
  onBack: () => void;
  onTaskAdd: () => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (id: string) => void;
  onTaskMove: (taskId: string, statusId: string) => void;
  showTaskForm: boolean;
  newTaskName: string;
  setNewTaskName: (v: string) => void;
  newTaskDescription: string;
  setNewTaskDescription: (v: string) => void;
  newTaskStatusId: string;
  setNewTaskStatusId: (v: string) => void;
  handleAddTask: () => void;
  handleUpdateTask: () => void;
  closeTaskForm: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronDown size={20} className="rotate-90" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{project.name}</h2>
          <p className="text-sm text-gray-400">{project.description || 'No description'}</p>
        </div>
        <button
          onClick={onTaskAdd}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">New Task</h3>
              <button onClick={closeTaskForm} className="p-1 rounded hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Task name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Description</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Status</label>
                <select
                  value={newTaskStatusId}
                  onChange={(e) => setNewTaskStatusId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {(project.statuses || []).map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddTask}
                disabled={!newTaskName.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-3 gap-4">
        {(project.statuses || []).map(status => {
          const statusTasks = (project.tasks || []).filter(t => t.statusId === status.id);
          return (
            <StatusColumn
              key={status.id}
              status={status}
              tasks={statusTasks}
              onTaskEdit={onTaskEdit}
              onTaskDelete={onTaskDelete}
              onTaskMove={onTaskMove}
              onStatusChange={onTaskMove}
            />
          );
        })}
      </div>
    </div>
  );
}

function StatusColumn({
  status,
  tasks,
  onTaskEdit,
  onTaskDelete,
  onTaskMove,
  onStatusChange,
}: {
  status: ProjectStatus;
  tasks: Task[];
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (id: string) => void;
  onTaskMove: (taskId: string, statusId: string) => void;
  onStatusChange: (taskId: string, statusId: string) => void;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const column = columnRef.current;
    if (!column) return;

    return dropTargetForElements({
      element: column,
      onDragEnter: () => setIsHovered(true),
      onDragLeave: () => setIsHovered(false),
      onDrop: ({ location }) => {
        setIsHovered(false);
        const dropEffect = location.current.dropTargets[0];
        if (dropEffect) {
          const taskId = dropEffect.element.getAttribute('data-task-id');
          if (taskId) {
            onTaskMove(taskId, status.id);
          }
        }
      },
    });
  }, [status.id, onTaskMove]);

  return (
    <div
      ref={columnRef}
      data-status-id={status.id}
      className={clsx(
        'rounded-xl border p-4 transition-colors',
        status.color,
        isHovered && 'ring-2 ring-blue-400 ring-inset'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{status.name}</h3>
        <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[200px]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={() => onTaskEdit(task)}
            onDelete={() => onTaskDelete(task.id)}
            onStatusChange={(statusId) => onStatusChange(task.id, statusId)}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No tasks</p>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (statusId: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    return draggable({
      element: card,
      onDragStart: () => setIsDragging(true),
      onDrag: () => setIsDragging(false),
    });
  }, []);

  return (
    <div
      ref={cardRef}
      data-task-id={task.id}
      className={clsx(
        'bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing transition-shadow',
        isDragging && 'shadow-lg opacity-50'
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="text-gray-300 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800">{task.name}</span>
            <div className="flex items-center gap-1">
              <button onClick={onEdit} className="p-1 text-gray-300 hover:text-blue-500">
                <Edit2 size={12} />
              </button>
              <button onClick={onDelete} className="p-1 text-gray-300 hover:text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1">{task.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}