import { ChoiceRow, IconMark, SwatchMark } from '@/components/ChoiceRow'
import { useChooseAppearance } from './useChooseAppearance'

export function ChooseAppearance() {
  const appearance = useChooseAppearance()

  return (
    <div className="flex shrink-0 items-center gap-2">
      <ChoiceRow
        label="Light or dark"
        value={appearance.mode}
        options={appearance.modeOptions}
        onChange={appearance.chooseMode}
        renderMark={(option) => <IconMark icon={option.icon} />}
      />
      <ChoiceRow
        label="Color theme"
        value={appearance.theme}
        options={appearance.themeOptions}
        onChange={appearance.chooseTheme}
        renderMark={(option) => <SwatchMark color={option.swatch} />}
      />
    </div>
  )
}
