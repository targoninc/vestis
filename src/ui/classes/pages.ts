export interface Page {
    icon: string;
    title: string;
    name: string;
}

export const pages: Page[] = [
    {
        icon: "home",
        title: "Home",
        name: "home"
    },
    {
        icon: "list",
        title: "Assets",
        name: "assets"
    },
    {
        icon: "inventory_2",
        title: "Sets",
        name: "sets"
    },
    {
        icon: "work",
        title: "Jobs",
        name: "jobs"
    },
    {
        icon: "calendar_month",
        title: "Calendar",
        name: "calendar"
    },
    {
        icon: "shopping_cart_checkout",
        title: "Checkout",
        name: "checkout"
    },
    {
        icon: "settings",
        title: "Settings",
        name: "settings"
    }
]