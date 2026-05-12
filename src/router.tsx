import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { PlatformsPage } from "@/pages/PlatformsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "platforms", element: <PlatformsPage /> },
    ],
  },
]);
