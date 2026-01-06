# CyberRange Red Team Theme - Quick Reference

## 🎨 Color Classes

### Primary Colors
```tsx
className="bg-primary text-primary-foreground"        // Blood red background, white text
className="bg-primary-container text-on-primary-container"  // Darker red container
className="text-primary"                               // Blood red text
```

### Secondary Colors
```tsx
className="bg-secondary text-secondary-foreground"    // Dark blood red secondary
className="bg-secondary-container"                     // Secondary container
```

### Surface Colors
```tsx
className="bg-background text-foreground"             // Base dark background
className="bg-card text-card-foreground"              // Card surface
className="surface-container"                          // MD3 surface container
className="surface-container-high"                     // Elevated surface
```

## 📝 Typography Classes

### Headlines
```tsx
<h1 className="md3-headline-large">Main Title</h1>          // 2rem, 400 weight
<h2 className="md3-headline-medium">Section Title</h2>      // 1.75rem
<h3 className="md3-headline-small">Subsection</h3>          // 1.5rem
```

### Titles
```tsx
<h4 className="md3-title-large">Card Title</h4>             // 1.375rem, 500 weight
<h5 className="md3-title-medium">Component Title</h5>       // 1rem, 500 weight
<h6 className="md3-title-small">Small Title</h6>            // 0.875rem, 500 weight
```

### Body Text
```tsx
<p className="md3-body-large">Large body text</p>           // 1rem, 400 weight
<p className="md3-body-medium">Medium body text</p>         // 0.875rem (default)
<p className="md3-body-small">Small body text</p>           // 0.75rem
```

### Labels
```tsx
<span className="md3-label-large">Button Label</span>       // 0.875rem, 500 weight
<span className="md3-label-medium">Small Label</span>       // 0.75rem, 500 weight
<span className="md3-label-small">Tiny Label</span>         // 0.688rem, 500 weight
```

## 🔘 Button Classes

### Filled Button (Primary)
```tsx
<Button className="md3-button md3-button-filled md3-state-layer">
  Launch Attack
</Button>
```

### Outlined Button
```tsx
<Button className="md3-button md3-button-outlined md3-state-layer">
  Configure
</Button>
```

### Text Button
```tsx
<Button className="md3-button md3-button-text md3-state-layer">
  Cancel
</Button>
```

## 🃏 Card Classes

### Elevated Card (Recommended)
```tsx
<Card className="md3-card-elevated blood-border">
  <CardHeader>
    <CardTitle className="md3-title-large blood-text">
      Attack Status
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Filled Card
```tsx
<Card className="md3-card-filled">
  {/* Content */}
</Card>
```

### Outlined Card
```tsx
<Card className="md3-card-outlined">
  {/* Content */}
</Card>
```

## ✨ Special Effects

### Blood Glow
```tsx
<div className="blood-glow p-4 rounded-lg">
  Glowing container
</div>
```

### Gradient Text
```tsx
<h1 className="gradient-text md3-headline-large">
  DDoS Attack Dashboard
</h1>
```

### Blood Text
```tsx
<span className="blood-text md3-label-large">
  CRITICAL ALERT
</span>
```

### Pulse Animation
```tsx
<div className="pulse-blood">
  Pulsing element
</div>
```

### Attack Pulse
```tsx
<div className="animate-attack-pulse">
  Active attack indicator
</div>
```

## 🔴 Status Indicators

### Online Status
```tsx
<div className="flex items-center gap-2">
  <div className="status-dot online" />
  <span className="md3-label-medium">System Online</span>
</div>
```

### Offline Status
```tsx
<div className="flex items-center gap-2">
  <div className="status-dot offline" />
  <span className="md3-label-medium">System Offline</span>
</div>
```

### Attacking Status
```tsx
<div className="flex items-center gap-2">
  <div className="status-dot attacking" />
  <span className="md3-label-medium">Attack In Progress</span>
</div>
```

## 💻 Terminal/Console

```tsx
<div className="terminal">
  <div className="md3-label-large text-[#00ff00] mb-2">
    $ python3 ddos_executor.py --target 10.72.200.54
  </div>
  <div className="md3-body-small text-muted-foreground">
    [INFO] Initializing attack vectors...
  </div>
  <div className="md3-body-small text-destructive">
    [ERROR] Connection timeout
  </div>
</div>
```

## 🎯 Attack Indicator Badge

```tsx
<Badge className="attack-indicator">
  5 Active
</Badge>
```

## 📐 Border Radius

```tsx
className="rounded-sm"        // 0.5rem (8px)
className="rounded-md"        // 0.75rem (12px) - MD3 default
className="rounded-lg"        // 1rem (16px)
className="rounded-xl"        // 1.5rem (24px)
className="rounded-2xl"       // 2rem (32px)
className="rounded-full"      // 9999px (circle)
```

## 🌐 Background Patterns

### Cyber Grid
```tsx
<div className="cyber-grid p-8">
  Content with subtle red grid background
</div>
```

## 🎨 Complete Example

```tsx
export default function DDoSControl() {
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="gradient-text md3-headline-large mb-2">
          DDoS Attack Control Center
        </h1>
        <p className="md3-body-medium text-muted-foreground">
          Real-time attack orchestration and monitoring
        </p>
      </div>

      {/* Status Card */}
      <Card className="md3-card-elevated blood-border mb-6">
        <CardHeader>
          <CardTitle className="md3-title-large blood-text flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription className="md3-body-small">
            Current attack operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="status-dot attacking" />
                <span className="md3-label-medium">Active Attacks</span>
              </div>
              <Badge className="attack-indicator md3-label-small">
                3 Running
              </Badge>
            </div>

            {/* Terminal Output */}
            <div className="terminal">
              <div className="md3-label-large text-[#00ff00]">
                $ python3 distributed_attack.py
              </div>
              <div className="md3-body-small text-muted-foreground">
                [INFO] Launching from 3 VMs...
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button className="md3-button md3-button-filled md3-state-layer">
          <Play className="mr-2 h-4 w-4" />
          Launch Attack
        </Button>
        <Button className="md3-button md3-button-outlined md3-state-layer">
          <Square className="mr-2 h-4 w-4" />
          Stop All
        </Button>
        <Button className="md3-button md3-button-text md3-state-layer">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
```

## 🎨 Color Palette (HSL Values)

```css
/* Primary Blood Red */
--primary: 0 84% 55%           /* Main brand color */
--primary-foreground: 0 5% 95% /* Text on primary */

/* Secondary */
--secondary: 0 22% 18%         /* Secondary actions */
--secondary-foreground: 0 12% 85%

/* Background */
--background: 0 20% 8%         /* Deep blood red-black */
--foreground: 0 15% 92%        /* Light text */

/* Card */
--card: 0 25% 12%              /* Card background */
--card-foreground: 0 10% 88%   /* Card text */

/* Accent */
--accent: 0 75% 50%            /* Bright accent */
--accent-foreground: 0 5% 95%

/* Destructive/Error */
--destructive: 0 90% 48%       /* Error state */
--destructive-foreground: 0 3% 97%

/* Warning */
--warning: 25 85% 55%          /* Blood orange */

/* Muted */
--muted: 0 18% 20%             /* Disabled elements */
--muted-foreground: 0 15% 65%  /* Subtle text */

/* Border */
--border: 0 40% 25% / 0.4      /* Blood red with opacity */
--ring: 0 84% 55%              /* Focus ring */
```

## 💡 Pro Tips

1. **Always use MD3 typography classes** instead of Tailwind's `text-*` for consistent sizing
2. **Add `md3-state-layer`** to all interactive elements for proper hover/focus feedback
3. **Use blood theme effects sparingly** - they're powerful but can be overwhelming
4. **Combine utility classes** - e.g., `className="md3-card-elevated blood-border blood-glow"`
5. **Check contrast** - ensure text is readable against backgrounds
6. **Use status dots** consistently across the app for visual consistency
7. **Terminal styling** works great for logs, commands, and technical output

## 🔗 Related Files

- Theme CSS: `/src/app/globals.css`
- Layout: `/src/app/layout.tsx`
- Full Documentation: `/THEME_UPDATE_SUMMARY.md`
