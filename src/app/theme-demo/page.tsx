import { ToggleTheme } from "@/components/ui/toggle-theme";
import { cn } from '@/lib/utils';

export default function ThemeDemo() {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-background">
            <div
                aria-hidden="true"
                className={cn(
                    'absolute inset-0 -z-10 size-full',
                    'bg-[radial-gradient(darkgray_2px,transparent_2px)]',
                    'bg-[size:12px_12px] opacity-20',
                )}
            />
            <div className="flex flex-col items-center gap-4">
                <h1 className="text-2xl font-bold">Theme Switcher Demo</h1>
                <ToggleTheme />
            </div>
        </div>
    );
}
