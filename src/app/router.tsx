import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AuthGate } from '../components/auth/AuthGate'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotebookWorkspacePage } from '../pages/NotebookWorkspacePage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGate>
        <HomePage />
      </AuthGate>
    ),
  },
  {
    path: '/notebook/:id',
    element: (
      <AuthGate>
        <NotebookWorkspacePage />
      </AuthGate>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
