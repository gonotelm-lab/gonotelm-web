import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AuthGate } from '../components/auth/AuthGate'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotebookWorkspacePage } from '../pages/NotebookWorkspacePage'
import { SetPasswordPage } from '../pages/SetPasswordPage'
import { SignupPage } from '../pages/SignupPage'
import { VerifyEmailPage } from '../pages/VerifyEmailPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  // 验证页公开：链接可能在未登录的浏览器里打开，验证成功那一刻服务端才建号并签发会话。
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  // 设置口令需要已认证会话（注册票据不匹配时的补救路径）。
  {
    path: '/set-password',
    element: (
      <AuthGate>
        <SetPasswordPage />
      </AuthGate>
    ),
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
