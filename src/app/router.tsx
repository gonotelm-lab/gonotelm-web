import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { NotebookWorkspacePage } from '../pages/NotebookWorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/notebook/:id',
    element: <NotebookWorkspacePage />,
  },
])
