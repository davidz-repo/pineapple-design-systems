import { Stack } from '@pineappleui/stack';

import { Text } from '@pineappleui/text';
import { TextField } from '@pineappleui/text-field';
import { Switch } from '@radix-ui/themes';

import type { StoryArgType } from '../../stories';

interface ArgControlProps {
  name: string;
  argType: StoryArgType | undefined;
  value: unknown;
  /** Hint for a free-text arg whose default is empty — see arg-placeholders. */
  placeholder?: string;
  onChange: (value: unknown) => void;
}

// One knob. The control kind comes from the story itself: an argTypes entry
// with options renders a select; otherwise the current value's type decides
// (booleans live only in `args`, never in `argTypes`, in this repo's
// stories). A native <select> on purpose: the stories use '' as a real
// option value ("inherit the theme accent"), which Radix's Select rejects.
export function ArgControl({ name, argType, value, placeholder, onChange }: ArgControlProps) {
  const id = `arg-${name}`;

  let control;
  if (argType?.options !== undefined) {
    control = (
      <select
        id={id}
        className="arg-select"
        value={String(value ?? '')}
        onChange={event => onChange(event.target.value)}
      >
        {argType.options.map(option => (
          <option key={String(option)} value={String(option)}>
            {option === '' ? '(default)' : String(option)}
          </option>
        ))}
      </select>
    );
  }
  else if (typeof value === 'boolean') {
    control = <Switch id={id} size="1" checked={value} onCheckedChange={onChange} />;
  }
  else if (typeof value === 'number') {
    control = (
      <TextField.Root
        id={id}
        size="1"
        type="number"
        placeholder={placeholder}
        value={String(value)}
        onChange={event => onChange(Number(event.target.value))}
      />
    );
  }
  else {
    control = (
      <TextField.Root
        id={id}
        size="1"
        placeholder={placeholder}
        value={String(value ?? '')}
        onChange={event => onChange(event.target.value)}
      />
    );
  }

  return (
    <Stack gap="1">
      <label htmlFor={id}>
        <Text size="1" weight="medium" color="gray">{name}</Text>
      </label>
      {control}
    </Stack>
  );
}
