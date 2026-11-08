import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './styles/fonts.css';
import './styles/global.css';
import './styles/motion.css';
import App from './App';

// data router: 대화 화면의 뒤로가기 확인 창(useBlocker)에 필요. 화면 경로는 App 안의 <Routes>에 있다.
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
