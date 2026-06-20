import { NavLink } from "react-router-dom";
import { Home, ShoppingCart, Receipt, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCartCount } from "@/api/hooks/useCart";

const navTabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/cart", label: "Cart", icon: ShoppingCart, end: false, badge: true },
  { to: "/orders", label: "Orders", icon: Receipt, end: false },
  { to: "/profile", label: "Account", icon: User, end: false },
];

export function BottomNav() {
  const cartCount = useCartCount();

  return (
    <nav className="sticky bottom-0 z-30 glass border-t border-border-faint px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5">
      <div className="flex items-stretch justify-around">
        {navTabs.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-semibold transition-colors",
                isActive ? "text-primary" : "text-text-3",
              )
            }
          >
            <span className="relative">
              <Icon size={23} />
              {badge && cartCount > 0 && (
                <span className="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-4 text-on-accent mono-num">
                  {cartCount}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
