import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "../components/Layout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { Spinner } from "../components/ui";
import { Home } from "../pages/Home";
import { Services } from "../pages/Services";
import { ServiceDetail } from "../pages/ServiceDetail";
import { ClearanceProcess } from "../pages/ClearanceProcess";
import { DocumentsGuide } from "../pages/DocumentsGuide";
import { Articles } from "../pages/Articles";
import { ArticleDetail } from "../pages/ArticleDetail";
import { Faq } from "../pages/Faq";
import { About } from "../pages/About";
import { Contact } from "../pages/Contact";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { NotFound } from "../pages/NotFound";

// Authenticated panels are heavier (forms, tables, Jalali date picker) and are
// not needed for the public site, so their code loads on demand.
const RequestNew = lazy(() =>
  import("../pages/RequestNew").then((module) => ({ default: module.RequestNew })),
);
const Dashboard = lazy(() => import("../pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const RequestDetail = lazy(() =>
  import("../pages/RequestDetail").then((module) => ({ default: module.RequestDetail })),
);
const Profile = lazy(() => import("../pages/Profile").then((module) => ({ default: module.Profile })));
const AdminDashboard = lazy(() =>
  import("../pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })),
);
const AdminRequestDetail = lazy(() =>
  import("../pages/admin/AdminRequestDetail").then((module) => ({ default: module.AdminRequestDetail })),
);
const AdminContent = lazy(() =>
  import("../pages/admin/AdminContent").then((module) => ({ default: module.AdminContent })),
);
const AdminUsers = lazy(() =>
  import("../pages/admin/AdminUsers").then((module) => ({ default: module.AdminUsers })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <Spinner label="در حال بارگذاری صفحه…" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
        <Route path="/services/:slug" element={<PublicLayout><ServiceDetail /></PublicLayout>} />
        <Route path="/clearance-process" element={<PublicLayout><ClearanceProcess /></PublicLayout>} />
        <Route path="/documents-guide" element={<PublicLayout><DocumentsGuide /></PublicLayout>} />
        <Route path="/articles" element={<PublicLayout><Articles /></PublicLayout>} />
        <Route path="/articles/:slug" element={<PublicLayout><ArticleDetail /></PublicLayout>} />
        <Route path="/faq" element={<PublicLayout><Faq /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
        <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />

        <Route
          path="/requests/new"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RequestNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/requests/:id"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <RequestDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN", "EXPERT"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/requests/:id"
          element={
            <ProtectedRoute roles={["ADMIN", "EXPERT"]}>
              <AdminRequestDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminContent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
      </Routes>
    </Suspense>
  );
}
