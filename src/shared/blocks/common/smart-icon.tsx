import { ComponentType, lazy, Suspense } from 'react';

const iconCache: { [key: string]: ComponentType<any> } = {};

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
  return remixToLucideIconMap[name] || name;
}

export function SmartIcon({
  name,
  size = 24,
  className,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  [key: string]: any;
}) {
  const iconName = normalizeIconName(name);

  if (!iconCache[iconName]) {
    iconCache[iconName] = lazy(async () => {
      try {
        const module = await import('lucide-react');
        const IconComponent = module[iconName as keyof typeof module];
        if (IconComponent) {
          return { default: IconComponent as ComponentType<any> };
        } else {
          console.warn(`Icon "${iconName}" not found in lucide-react`);
          return { default: module.HelpCircle as ComponentType<any> };
        }
      } catch (error) {
        console.error(`Failed to load lucide-react:`, error);
        const fallbackModule = await import('lucide-react');
        return { default: fallbackModule.HelpCircle as ComponentType<any> };
      }
    });
  }

  const IconComponent = iconCache[iconName];

  return (
    <Suspense fallback={<div style={{ width: size, height: size }} />}>
      <IconComponent size={size} className={className} {...props} />
    </Suspense>
  );
}
