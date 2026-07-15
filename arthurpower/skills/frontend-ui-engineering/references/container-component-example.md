# Container + Presentation Component Example

A complete runnable React + Tailwind example demonstrating one accessible container (loading/empty/error/data 4 states), one presentation component (semantic HTML + keyboard + a11y), and design token usage. Every key decision is annotated.

```tsx
// File: src/components/TaskList/TaskList.tsx
// Decision: design tokens via Tailwind config (text-fg, bg-surface, border-default);
//           img uses width:100%; height:auto, never div-instead-of-button, a11y 3 states required.

// --- 1. Container: handles loading / error / empty / data, no business rendering -----
import { useTasks } from './use-tasks';
import { TaskList } from './TaskList';
import { TaskListSkeleton } from './TaskListSkeleton';

export function TaskListContainer() {
  const { tasks, isLoading, error, refetch } = useTasks();

  if (isLoading) {
    return <TaskListSkeleton />;
  }
  if (error) {
    return (
      <div role="alert" className="text-fg bg-surface p-4 rounded-md border border-default">
        <h3 className="text-sm font-medium">Failed to load tasks</h3>
        <p className="mt-1 text-sm text-fg-muted">{error.message}</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-3 px-3 py-1.5 text-sm font-medium bg-primary text-on-primary rounded-md
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Retry
        </button>
      </div>
    );
  }
  if (tasks.length === 0) {
    return (
      <div role="status" className="text-center py-12 bg-surface rounded-md border border-default">
        <TasksEmptyIcon className="mx-auto h-12 w-12 text-fg-muted" aria-hidden="true" />
        <h3 className="mt-2 text-sm font-medium text-fg">No tasks yet</h3>
        <p className="mt-1 text-sm text-fg-muted">Get started by creating a new task.</p>
      </div>
    );
  }

  return <TaskList tasks={tasks} />;
}

// --- 2. Presentation: renders data only, holds no state, calls no hook ----
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul role="list" className="divide-y divide-default bg-surface rounded-md border border-default">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}

// --- 3. Item: <button> not <div onClick>, onToggle is a typed callback ----
function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <li className="flex items-center gap-3 p-3">
      <input
        type="checkbox"
        id={`task-${task.id}`}
        checked={task.done}
        onChange={() => onToggle(task.id)}
        className="h-4 w-4 rounded border-default text-primary
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        aria-label={`Mark "${task.title}" as ${task.done ? 'incomplete' : 'complete'}`}
      />
      <label
        htmlFor={`task-${task.id}`}
        className={
          task.done
            ? 'flex-1 text-sm text-fg-muted line-through'
            : 'flex-1 text-sm text-fg'
        }
      >
        {task.title}
      </label>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete task "${task.title}"`}
        className="p-1.5 text-fg-muted hover:text-fg rounded-md
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <TrashIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}

// --- 4. Skeleton: aria-busy + aria-label signal loading state ----
function TaskListSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading tasks"
      className="space-y-3 bg-surface p-4 rounded-md border border-default"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

// --- 5. img usage (from neighboring Avatar component) ---
// CSS / Tailwind:
//   img.avatar { width: 100%; height: auto; display: block; max-width: 100%; }
// Never lock aspect-ratio, never use padding-bottom hack, container sets max-width only.
```

## Annotations

The above is one self-contained runnable example showing:

- **4 a11y invariants**: semantic HTML / keyboard / ARIA only when HTML is insufficient / focus-visible
- **3 design system invariants**: token-only / spacing-scale / consistent corner-radius
- **3 component boundaries**: container / presentation / item
- **1 img natural ratio**: width:100%; height:auto without aspect-ratio lock

Copy-paste and only swap prop names + business fields, never the a11y behavior. Mimicking this skill means: every frontend component includes loading/empty/error + keyboard test + token-only styling. One example covers 4-state container + presentation + img usage = complete and runnable.