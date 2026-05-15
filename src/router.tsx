import { createBrowserRouter } from "react-router";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/HomePage";
import { PlatformsPage } from "@/pages/PlatformsPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { PostsPage } from "@/pages/PostsPage";
import { StatsPage } from "@/pages/StatsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "posts", element: <PostsPage /> },
      { path: "posts/:postId", element: <PostDetailPage /> },
      { path: "platforms", element: <PlatformsPage /> },
      { path: "stats", element: <StatsPage /> },
    ],
  },
]);
