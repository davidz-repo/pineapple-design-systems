// Compiler fixture for `../react-library.json` — input to this package's
// `typecheck`, not shipped and not imported by anything.
//
// This one earns its keep: `react-library.json` is currently referenced by no
// executable workspace at all, so until the first React package lands, a typo in
// it would surface nowhere. Compiling a real component against it exercises the
// options only a .tsx file can reach:
//
//   jsx: "react-jsx"      — JSX without importing React (else TS17004)
//   lib: [..., "DOM"]     — `document` and friends (else TS2584)
//   declaration           — .d.ts emit stays well-formed for a component
//
// Verified by mutation: setting `jsx` to an invalid value, or dropping "DOM"
// from `lib`, fails this check.

export interface FixtureProps {
  readonly label: string;
}

export function Fixture({ label }: FixtureProps) {
  return (
    <button type="button" onClick={() => document.title = label}>
      {label}
    </button>
  );
}
