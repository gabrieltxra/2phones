import { Navigate, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { RoomPage } from "./pages/RoomPage";
import { LegalPage } from "./pages/LegalPage";
import { AdminLogin } from "./pages/AdminLogin";
import { Admin } from "./pages/Admin";

export default function App(){return <Routes><Route path="/" element={<Landing/>}/><Route path="/play" element={<RoomPage/>}/><Route path="/play/:code" element={<RoomPage/>}/><Route path="/join/:code" element={<RoomPage joining/>}/><Route path="/privacy" element={<LegalPage kind="privacy"/>}/><Route path="/terms" element={<LegalPage kind="terms"/>}/><Route path="/admin/login" element={<AdminLogin/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>}
