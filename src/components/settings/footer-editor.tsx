"use client";

import { Input, Label } from "@/components/ui/input";
import type { FooterConfig, FooterSectionConfig } from "@/lib/footer-config";
import { DEFAULT_FOOTER_CONFIG } from "@/lib/footer-config";

interface FooterEditorProps {
  value: FooterConfig;
  onChange: (config: FooterConfig) => void;
}

export function FooterEditor({ value, onChange }: FooterEditorProps) {
  const config = value?.sections?.length ? value : DEFAULT_FOOTER_CONFIG;

  function updateSection(index: number, patch: Partial<FooterSectionConfig>) {
    const sections = config.sections.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...config, sections });
  }

  function updateLink(sectionIndex: number, linkIndex: number, enabled: boolean) {
    const sections = config.sections.map((s, i) => {
      if (i !== sectionIndex) return s;
      return {
        ...s,
        links: s.links.map((l, j) => (j === linkIndex ? { ...l, enabled } : l)),
      };
    });
    onChange({ ...config, sections });
  }

  function toggleFlag(key: "showSocial" | "showContact" | "showCopyright", checked: boolean) {
    onChange({ ...config, [key]: checked });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 rounded-md border bg-zinc-50 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.showSocial}
            onChange={(e) => toggleFlag("showSocial", e.target.checked)}
          />
          Show social icons
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.showContact}
            onChange={(e) => toggleFlag("showContact", e.target.checked)}
          />
          Show contact block
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.showCopyright}
            onChange={(e) => toggleFlag("showCopyright", e.target.checked)}
          />
          Show copyright bar
        </label>
      </div>

      {config.sections.map((section, sectionIndex) => (
        <div key={section.id} className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={section.enabled}
                onChange={(e) => updateSection(sectionIndex, { enabled: e.target.checked })}
              />
              Show section
            </label>
            <div className="flex-1">
              <Label className="sr-only">Section title</Label>
              <Input
                value={section.title}
                onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>
          <ul className="space-y-2">
            {section.links.map((link, linkIndex) => (
              <li key={`${link.href}-${linkIndex}`} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={link.enabled}
                  onChange={(e) => updateLink(sectionIndex, linkIndex, e.target.checked)}
                />
                <span className="min-w-0 flex-1 truncate text-zinc-700">{link.label}</span>
                <span className="hidden text-xs text-zinc-400 sm:inline">{link.href}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
