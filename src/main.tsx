import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import Presenter from './screens/Presenter';
import Phone from './screens/Phone';
import Harness from './games/Harness';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Presenter />} />
        <Route path="/play" element={<Phone />} />
        <Route path="/dev" element={<Harness />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
