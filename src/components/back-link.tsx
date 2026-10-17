import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
export function BackToValidations() {
  return <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Volver a Validaciones</Link>;
}
