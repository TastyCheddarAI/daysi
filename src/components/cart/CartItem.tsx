import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, CartItem as CartItemType } from "@/contexts/CartContext";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem, getItemPrice } = useCart();

  const price = getItemPrice(item);

  return (
    <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.name}</h4>
        {item.is_package && item.package_sessions && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Package: {item.package_sessions} sessions
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-sm">${price.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => removeItem(item.product_id, item.is_package)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.is_package)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.is_package)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
