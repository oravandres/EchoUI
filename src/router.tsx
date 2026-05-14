import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { PlatformsPage } from "@/pages/PlatformsPage";
import { PostsPage } from "@/pages/PostsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "posts", element: <PostsPage /> },
      { path: "platforms", element: <PlatformsPage /> },
    ],
  },
]);
