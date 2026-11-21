// PROTOTYPE-ONLY: the Inspect panel of the prototype environment, built
// from kit's parts (ValueField takes any CSS value, with the site's own
// variables offered; ColorPickerField offers the colour variables; BoxModel
// edits margin and padding). Every change is an edit at the chosen
// breakpoint (see edits.ts); "Copy for Claude" gives the summary.
import { useState } from 'react';
import {
  BoxModel, Button, ClassChips, ColorPickerField, EmptyState, Field, Note, Row, Section, Segmented, Select, Stack, Switch, Tag, Text, ValueField,
} from '@weftly/components';
import { BPS, bpInfo, type Bp, type Edits, type Target } from './edits';
import type { FrameId } from './App';
import { hasRuleAt } from './frames';

export interface Selection { target: Target; frame: FrameId; bp: Bp; el: HTMLElement }
type Variable = { name: string; value: string; type?: string };

interface Props {
  selection: Selection | null;
  edits: Edits;
  valuesAt: (bp: Bp) => Record<string, string>;
  bodyPx: (bp: Bp) => number;
  variables: readonly Variable[];
  onlyThis: boolean;
  onOnlyThis: (v: boolean) => void;
  page: string;
  onPick: () => void;
  onBp: (bp: Bp) => void;
  onParent: () => void;
}

type Row = { prop: string; label: string; kind?: 'select' | 'color'; options?: readonly string[] };
const GROUPS: { title: string; rows: Row[] }[] = [
  { title: 'Type', rows: [
    { prop: 'font-family', label: 'Family', kind: 'select', options: ['Geist', 'Geist Mono'] },
    { prop: 'font-size', label: 'Size' },
    { prop: 'font-weight', label: 'Weight', kind: 'select', options: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
    { prop: 'line-height', label: 'Line height' },
    { prop: 'letter-spacing', label: 'Tracking' },
    { prop: 'text-transform', label: 'Case', kind: 'select', options: ['none', 'uppercase', 'lowercase', 'capitalize'] },
    { prop: 'text-align', label: 'Align', kind: 'select', options: ['start', 'left', 'center', 'right', 'justify'] },
    { prop: 'text-wrap', label: 'Wrap', kind: 'select', options: ['wrap', 'pretty', 'balance', 'nowrap'] },
    { prop: 'color', label: 'Colour', kind: 'color' },
  ] },
  { title: 'Gaps', rows: [{ prop: 'row-gap', label: 'Row gap' }, { prop: 'column-gap', label: 'Column gap' }] },
  { title: 'Size', rows: ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'aspect-ratio'].map((p) => ({ prop: p, label: p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) })) },
  { title: 'Layout', rows: [
    { prop: 'display', label: 'Display', kind: 'select', options: ['block', 'flex', 'grid', 'inline-block', 'inline-flex', 'inline', 'none'] },
    { prop: 'flex-direction', label: 'Direction', kind: 'select', options: ['row', 'column', 'row-reverse', 'column-reverse'] },
    { prop: 'flex-wrap', label: 'Wrap', kind: 'select', options: ['nowrap', 'wrap'] },
    { prop: 'justify-content', label: 'Justify', kind: 'select', options: ['normal', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly', 'stretch'] },
    { prop: 'align-items', label: 'Align', kind: 'select', options: ['normal', 'stretch', 'flex-start', 'center', 'flex-end', 'baseline'] },
    { prop: 'align-self', label: 'Align self', kind: 'select', options: ['auto', 'stretch', 'flex-start', 'center', 'flex-end'] },
    { prop: 'grid-template-columns', label: 'Columns' },
    { prop: 'grid-template-rows', label: 'Rows' },
    { prop: 'flex', label: 'Flex' },
    { prop: 'overflow', label: 'Overflow' },
  ] },
  { title: 'Look', rows: [
    { prop: 'background-color', label: 'Fill', kind: 'color' },
    { prop: 'background-image', label: 'Image' },
    { prop: 'border-radius', label: 'Radius' },
    { prop: 'border', label: 'Border' },
    { prop: 'box-shadow', label: 'Shadow' },
    { prop: 'opacity', label: 'Opacity' },
    { prop: 'backdrop-filter', label: 'Backdrop' },
  ] },
  { title: 'Position', rows: [
    { prop: 'position', label: 'Position', kind: 'select', options: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
    ...['top', 'right', 'bottom', 'left', 'z-index', 'transform'].map((p) => ({ prop: p, label: p.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) })),
  ] },
];
const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const px = (v: string | undefined) => parseFloat(v ?? '') || 0;

export function Inspector({ selection, edits, valuesAt, bodyPx, variables, onlyThis, onOnlyThis, page, onPick, onBp, onParent }: Props) {
  const [custom, setCustom] = useState({ prop: '', value: '' });
  const [copied, setCopied] = useState(false);
  const all = edits.all();

  const copy = async () => {
    const text = edits.summary(page, bodyPx);
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('Copy this:', text); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const changes = (
    <Section title="Changes" right={all.length ? <Tag tone="accent">{`${all.length}`}</Tag> : undefined}>
      <Stack gap={8} className="cv-pad">
        {all.length ? (
          <pre className="cv-changes">{all.map((e) => `${bpInfo(e.bp).name} · ${e.target.label}\n  ${e.prop}: ${e.from} → ${e.to}`).join('\n')}</pre>
        ) : (
          <Note>No changes yet. Every change applies at the chosen breakpoint and below, like Webflow.</Note>
        )}
        <Row gap={8}>
          <Button size="sm" variant="primary" icon="copy" disabled={!all.length} onClick={copy}>{copied ? 'Copied' : 'Copy for Claude'}</Button>
          <Button size="sm" variant="ghost" icon="rotate-ccw" disabled={!all.length} onClick={() => edits.clear()}>Reset all</Button>
        </Row>
      </Stack>
    </Section>
  );

  if (!selection) {
    return (
      <Stack gap={0}>
        <EmptyState title="Nothing selected" action={<Button size="sm" variant="primary" icon="scan" onClick={onPick}>Pick an element</Button>}>
          Turn on Inspect (⌥T) and click any element in any frame.
        </EmptyState>
        {changes}
      </Stack>
    );
  }

  const { target, bp } = selection;
  const values = valuesAt(bp);
  const value = (prop: string) => edits.get(target, bp, prop)?.to ?? values[prop] ?? '';
  // Webflow's cascade: the edit applies at this breakpoint and below, except
  // where a smaller breakpoint has its own value: a rule in its media query,
  // or a different computed value in its frame (a variable that changes
  // there). The edit then stops above it. Mobile landscape has no frame: a
  // difference only Mobile portrait shows, with no portrait rule, is
  // landscape's.
  const set = (prop: string, to: string) => {
    let minWidth: number | null = null;
    let keeps: string | undefined;
    const here = values[prop];
    const doc = selection.el.ownerDocument;
    const lower = BPS.slice(BPS.findIndex((b) => b.id === bp) + 1);
    const differs = (id: Bp) => { const v = valuesAt(id)[prop]; return v !== undefined && v !== here; };
    for (const l of lower) {
      if (edits.get(target, l.id, prop)) break; // you set it there yourself
      const own = hasRuleAt(doc, selection.el, prop, l.max!) ||
        (l.id === 'tablet' && bp === 'base' && differs('tablet')) ||
        (l.id === 'landscape' && differs('mobile') && !hasRuleAt(doc, selection.el, prop, 479)) ||
        (l.id === 'mobile' && differs('mobile'));
      if (own) { minWidth = l.max! + 1; keeps = l.name; break; }
    }
    edits.set({ target, bp, prop, from: here ?? '', to, minWidth, keeps });
  };
  const changed = (prop: string) => Boolean(edits.get(target, bp, prop));
  const classes = Array.from(selection.el.classList).filter((c) => !c.startsWith('w-variant'));
  const colorSwatches = [{ label: 'Site variables', colors: variables.filter((v) => v.type === 'color').map((v) => ({ value: v.value, name: v.name })) }];

  const control = (r: Row) => {
    const v = value(r.prop);
    if (r.kind === 'select') {
      const options = r.options!.includes(v) ? r.options! : [v, ...r.options!];
      return <Select label={r.label} value={v} options={options} onValueChange={(to) => set(r.prop, to)} />;
    }
    if (r.kind === 'color') {
      return <ColorPickerField label={r.label} value={v} swatches={colorSwatches} onValueChange={(to) => set(r.prop, to)} onBindVariable={(name) => set(r.prop, `var(${name})`)} />;
    }
    return <ValueField label={r.label} value={v} variables={variables} rootSize={bodyPx(bp)} onValueChange={(to) => set(r.prop, to)} />;
  };

  return (
    <Stack gap={0}>
      <Section>
        <Stack gap={8} className="cv-pad">
          {classes.length ? <ClassChips classes={classes} /> : <Text className="cv-mono">{selection.el.tagName.toLowerCase()}</Text>}
          <Text className="cv-dim cv-chain">{target.chain}</Text>
          <Row gap={8} wrap>
            <Button size="sm" variant="ghost" icon="arrow-up" onClick={onParent}>Parent</Button>
            <Button size="sm" variant="ghost" icon="scan" onClick={onPick}>Pick another</Button>
          </Row>
          <label className="cv-switch">
            <Switch label="This element only" checked={onlyThis} onCheckedChange={onOnlyThis} />
            <Text>This element only (else every element with these classes)</Text>
          </label>
        </Stack>
      </Section>

      <Section title="Breakpoint">
        <Stack gap={8} className="cv-pad">
          <Segmented<Bp>
            label="Breakpoint"
            variant="full"
            value={bp}
            onValueChange={onBp}
            options={BPS.map((b) => ({ value: b.id, label: b.id === 'base' ? 'Desktop' : b.id === 'tablet' ? 'Tablet' : b.id === 'landscape' ? 'Mob. L' : 'Mob. P' }))}
          />
          <Note>{bp === 'base' ? 'Desktop · base styles: applies at every width unless a smaller breakpoint overrides it.' : `${bpInfo(bp).name} · applies at ${bpInfo(bp).scope.replace('≤ ', '')} and below.`}</Note>
        </Stack>
      </Section>

      {GROUPS.slice(0, 1).map((g) => (
        <Section key={g.title} title={g.title}>
          <div className="cv-rows">{g.rows.map((r) => <PropRow key={r.prop} label={r.label} changed={changed(r.prop)}>{control(r)}</PropRow>)}</div>
        </Section>
      ))}

      <Section title="Spacing">
        <div className="cv-pad">
          <BoxModel
            editable
            label="Spacing"
            size={`${Math.round(selection.el.getBoundingClientRect().width)} × ${Math.round(selection.el.getBoundingClientRect().height)}`}
            margin={SIDES.map((s) => px(value(`margin-${s}`))) as unknown as readonly [number, number, number, number]}
            padding={SIDES.map((s) => px(value(`padding-${s}`))) as unknown as readonly [number, number, number, number]}
            onChange={({ margin, padding }) => {
              // Sides come as [top, right, bottom, left].
              SIDES.forEach((s, i) => {
                if (margin[i] !== px(value(`margin-${s}`))) set(`margin-${s}`, `${margin[i]}px`);
                if (padding[i] !== px(value(`padding-${s}`))) set(`padding-${s}`, `${padding[i]}px`);
              });
            }}
          />
          <Note>In px at this breakpoint. For an em or a variable, type it in the value fields below.</Note>
        </div>
        <div className="cv-rows">
          {SIDES.flatMap((s) => [`padding-${s}`, `margin-${s}`]).map((p) => (
            <PropRow key={p} label={p.replace('-', ' ')} changed={changed(p)}>
              <ValueField label={p} value={value(p)} variables={variables} rootSize={bodyPx(bp)} onValueChange={(to) => set(p, to)} />
            </PropRow>
          ))}
        </div>
      </Section>

      {GROUPS.slice(1).map((g) => (
        <Section key={g.title} title={g.title}>
          <div className="cv-rows">{g.rows.map((r) => <PropRow key={r.prop} label={r.label} changed={changed(r.prop)}>{control(r)}</PropRow>)}</div>
        </Section>
      ))}

      <Section title="Any other property">
        <Stack gap={8} className="cv-pad">
          <Field size="sm" mono placeholder="property, e.g. word-spacing" value={custom.prop} onChange={(e) => setCustom({ ...custom, prop: e.currentTarget.value })} aria-label="Property" />
          <ValueField label="Value" value={custom.value} variables={variables} rootSize={bodyPx(bp)} onValueChange={(v) => setCustom({ ...custom, value: v })} />
          <Row gap={8}>
            <Button size="sm" icon="plus" disabled={!custom.prop.trim()} onClick={() => set(custom.prop.trim(), custom.value)}>Set</Button>
          </Row>
        </Stack>
      </Section>

      {changes}
    </Stack>
  );
}

function PropRow({ label, changed, children }: { label: string; changed: boolean; children: React.ReactNode }) {
  return (
    <div className="cv-row" data-changed={changed ? '' : undefined}>
      <Text className="cv-row-label">{label}</Text>
      <div className="cv-row-control">{children}</div>
    </div>
  );
}
