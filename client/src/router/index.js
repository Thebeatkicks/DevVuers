import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/guider/:slug",
      name: "guide-by-slug",
      component: () => import("../views/GuideDetailView.vue"),
    },
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/guides",
      name: "guides",
      component: () => import("../views/GuidesView.vue"),
    },
    {
      path: "/guides/:id",
      name: "guide-details",
      component: () => import("../views/GuideDetailView.vue"),
    },
    {
      path: "/about",
      name: "about",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/AboutView.vue"),
    },
    {
      path: "/tours",
      name: "turer",
      component: () => import("../views/ToursView.vue"),
    },
    {
      path: "/tours/:id",
      name: "tour-detail",
      component: () => import("../views/TourDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/logga-in",
      alias: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/profile",
      alias: "/profil",
      name: "profil",
      component: () => import("../views/ProfileView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/register",
      name: "registrera",
      component: () => import("../views/RegisterView.vue"),
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: "login", query: { till: to.fullPath } };
  }
});

export default router;
