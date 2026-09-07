import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";
import TaskManager from "@/pages/TaskManager";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path="/404" component={NotFound} />
      <Route component={TaskManager} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
