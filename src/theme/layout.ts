export const layoutTokens = {
  phone: {
    containerWidth: "100%",
    sidebarWidth: "0px", // no sidebar on phone
    bottomBarHeight: "80px",
    headerHeight: "200px",
    contentPadding: "16px",
  },
  tabletMobile: {
    containerWidth: "100%",
    sidebarWidth: "0px",
    bottomBarHeight: "88px",
    headerHeight: "220px",
    contentPadding: "24px",
  },
  tabletHybrid: {
    containerWidth: "100%",
    sidebarWidth: "200px",
    bottomBarHeight: "0px",
    headerHeight: "64px",
    contentPadding: "24px",
  },
  desktop: {
    containerWidth: "100%",
    sidebarWidth: "224px",
    bottomBarHeight: "0px",
    headerHeight: "56px",
    contentPadding: "32px",
  },
} as const;
