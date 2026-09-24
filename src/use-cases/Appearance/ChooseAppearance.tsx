import { IconChoiceSelect } from '@/components/IconChoiceSelect'
import { SwatchSelect } from '@/components/SwatchSelect'
import { useChooseAppearance } from './useChooseAppearance'

export function ChooseAppearance() {
  const appearance = useChooseAppearance()

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <IconChoiceSelect
        label={appearance.modeLabel}
        value={appearance.mode}
        icon={appearance.modeIcon}
        options={appearance.modeOptions}
        onChange={appearance.chooseMode}
      />
      <SwatchSelect
        label="Color theme"
        value={appearance.theme}
        swatch={appearance.themeSwatch}
        options={appearance.themeOptions}
        onChange={appearance.chooseTheme}
      />
    </div>
  )
}
