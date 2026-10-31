import { lazy, Suspense } from 'react';
import type { LucideProps } from 'lucide-react';

const remixToLucideIconMap: Record<string, string> = {
  RiAddLine: 'Plus',
  RiBarChart2Line: 'ChartColumn',
  RiChat2Line: 'MessagesSquare',
  RiClapperboardAiLine: 'Clapperboard',
  RiCloudy2Fill: 'Cloud',
  RiCloudyFill: 'Cloud',
  RiCodeFill: 'Code',
  RiDatabase2Line: 'Database',
  RiDeleteBinLine: 'Trash2',
  RiDiscordFill: 'MessageCircle',
  RiEditLine: 'Pencil',
  RiEyeLine: 'Eye',
  RiFlashlightFill: 'Zap',
  RiKey2Fill: 'KeyRound',
  RiKeyLine: 'KeyRound',
  RiLockPasswordLine: 'LockKeyhole',
  RiNextjsFill: 'PanelTop',
  RiRefreshLine: 'RefreshCcw',
  RiRobot2Line: 'Bot',
  RiTaskLine: 'ListTodo',
  RiTwitterXFill: 'Twitter',
};

function normalizeIconName(name: string) {
  return Object.prototype.hasOwnProperty.call(remixToLucideIconMap, name)
    ? remixToLucideIconMap[name]
    : name;
}

type NamedIconProps = LucideProps & { name: string };

// One static lazy boundary; each instance selects its own icon from Lucide's
// icon-only registry. No render-time mutation or untrusted module-export cast.
const LazyIcon = lazy(async () => {
  const iconModule = await import('lucide-react').catch(async (error: unknown) => {
    console.error('Failed to load lucide-react:', error);
    // Retry once. A recovered module must resolve each instance's actual name;
    // a shared lazy boundary must not permanently turn every icon into fallback.
    return import('lucide-react');
  });
  const { icons, HelpCircle } = iconModule;
  // Public exports include aliases absent from the registry (e.g. Home).
  // Resolve only exports that are actual members of the icon registry.
  const knownIcons = new Map<unknown, (typeof icons)[keyof typeof icons]>(
    Object.values(icons).map((icon) => [icon, icon])
  );
  const aliases: Record<string, (typeof icons)[keyof typeof icons]> = Object.create(null);
  for (const [name, exported] of Object.entries(iconModule)) {
    const icon = knownIcons.get(exported);
    if (icon) aliases[name] = icon;
  }
  function LoadedIcon({ name, ...props }: NamedIconProps) {
    const Icon = Object.prototype.hasOwnProperty.call(aliases, name)
      ? aliases[name]
      : HelpCircle;
    return <Icon {...props} />;
  }
  return { default: LoadedIcon };
});

export function SmartIcon({
  name,
  size = 24,
  className,
  ...props
}: LucideProps & {
  name: string;
  size?: number;
}) {
  return (
    <Suspense fallback={<div style={{ width: size, height: size }} />}>
      <LazyIcon name={normalizeIconName(name)} size={size} className={className} {...props} />
    </Suspense>
  );
}
