import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { AdminDashboard, AdminLogin, LocalSetup } from "./pages";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<App />} />
				<Route path="/local-setup" element={<LocalSetup />} />
				<Route path="/admin/login" element={<AdminLogin />} />
				<Route path="/admin" element={<AdminDashboard />} />
			</Routes>
		</BrowserRouter>
	</React.StrictMode>,
);
