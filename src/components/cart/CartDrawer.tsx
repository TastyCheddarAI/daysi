import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { CartItem } from "./CartItem";
import { ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function CartDrawer() {
  const { items, isOpen, setIsOpen, clearCart, getItemPrice, itemCount } = useCart();
  const { user } = useAuth();

  const subtotal = items.reduce((acc, item) => {
    const price = getItemPrice(item);
    return acc + price * item.quantity;
  }, 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Browse our services and add items to your cart
            </p>
            <Button asChild onClick={() => setIsOpen(false)}>
              <Link to="/services">Browse Services</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <CartItem key={`${item.product_id}-${item.is_package}`} item={item} />
              ))}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                {user ? (
                  <Button className="w-full" size="lg" asChild onClick={() => setIsOpen(false)}>
                    <Link to="/dashboard">Open My Daysi Account</Link>
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" asChild onClick={() => setIsOpen(false)}>
                    <Link to="/auth?redirect=/dashboard">Sign in to Continue</Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full" asChild onClick={() => setIsOpen(false)}>
                  <Link to="/pricing">Review Current Pricing</Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
