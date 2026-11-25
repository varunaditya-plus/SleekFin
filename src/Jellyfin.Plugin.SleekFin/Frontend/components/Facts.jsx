import { Icon } from './Icon.jsx';
import { Fragment, h } from 'preact';

export function Facts({ values, keepTogether = false }) {
  const visibleValues = (values || []).filter((value) => value?.text);
  const Group = keepTogether ? 'span' : Fragment;
  return visibleValues.map((value, index) => (
    <Group key={`${value.text}-${index}`} class={keepTogether ? 'sleekfin-fact-group' : undefined}>
      {index > 0 && <span class="sleekfin-fact-dot">·</span>}
      <span class={`sleekfin-fact${value.className ? ` ${value.className}` : ''}`}>
        {value.icon && <Icon name={value.icon} />}
        {String(value.text)}
      </span>
    </Group>
  ));
}
