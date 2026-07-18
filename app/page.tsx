import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Phase 0 smoke page: proves shadcn/ui (button, card, input, label) and the
// Tailwind theme are wired up. Replaced with real UI in a later phase.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>sass-ninja-kit</CardTitle>
          <CardDescription>
            Phase 0 foundation — shadcn/ui is wired up.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <Button className="w-full">It works</Button>
        </CardContent>
      </Card>
    </main>
  );
}
