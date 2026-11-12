import { createRouter, createWebHistory } from "vue-router";
import { useSessionStore } from "@/stores/session";
import HomeView from "../views/HomeView.vue";
import GuidesView from "../views/GuidesView.vue";
import GuideDetails from "../views/GuideDetails.vue";
import ToursView from "@/views/ToursView.vue";
import TourDetail from "@/views/TourDetail.vue";
import ProfileView from "@/views/ProfileView.vue";
import RegisterView from "@/views/RegisterView.vue";
import LoginView from "@/views/LoginView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/guides",
      name: "guides",
      component: GuidesView,
    },
    {
      path: "/guides/:id",
      name: "guide-details",
      component: GuideDetails,
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
      component: ToursView,
    },
    {
      path: "/tours/:id",
      name: "tour-detail",
      component: TourDetail,
      meta: { requiresAuth: true },
    },
    {
      path: "/logga-in",
      name: "logga in",
      component: LoginView,
    },
    {
      path: "/profile",
      name: "profil",
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    {
      path: "/register",
      name: "registrera",
      component: RegisterView,
    },
  ],
});

router.beforeEach((to) => {
  const session = useSessionStore();
  if (to.meta.requiresAuth && !session.isLoggedIn) {
    return { path: "/logga-in", query: { redirect: to.fullPath } };
  }
});

export default router;
