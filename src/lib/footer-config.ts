export interface FooterLinkConfig {
  label: string;
  href: string;
  enabled: boolean;
}

export interface FooterSectionConfig {
  id: string;
  title: string;
  enabled: boolean;
  links: FooterLinkConfig[];
}

export interface FooterConfig {
  sections: FooterSectionConfig[];
  showSocial: boolean;
  showContact: boolean;
  showCopyright: boolean;
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  showSocial: true,
  showContact: true,
  showCopyright: true,
  sections: [
    {
      id: "shop",
      title: "Shop",
      enabled: true,
      links: [
        { label: "All Fits", href: "/shop", enabled: true },
        { label: "Hoodies", href: "/shop?category=hoodies", enabled: true },
        { label: "Tees", href: "/shop?category=tees", enabled: true },
        { label: "Accessories", href: "/shop?category=accessories", enabled: true },
        { label: "Size Guide", href: "/size-guide", enabled: true },
      ],
    },
    {
      id: "company",
      title: "Company",
      enabled: true,
      links: [
        { label: "The Lore", href: "/about", enabled: true },
        { label: "Hit Us Up", href: "/contact", enabled: true },
        { label: "FAQ", href: "/contact#faq", enabled: true },
        { label: "Shipping & Returns", href: "/shipping-returns", enabled: true },
      ],
    },
    {
      id: "account",
      title: "Account",
      enabled: true,
      links: [
        { label: "My Account", href: "/account", enabled: true },
        { label: "Order History", href: "/account/orders", enabled: true },
        { label: "Wishlist", href: "/account/wishlist", enabled: true },
        { label: "Addresses", href: "/account/addresses", enabled: true },
      ],
    },
    {
      id: "legal",
      title: "Legal",
      enabled: true,
      links: [
        { label: "Privacy Policy", href: "/privacy", enabled: true },
        { label: "Terms of Service", href: "/terms", enabled: true },
        { label: "Shipping & Returns", href: "/shipping-returns", enabled: true },
      ],
    },
  ],
};

export function mergeFooterConfig(raw?: Partial<FooterConfig> | null): FooterConfig {
  if (!raw?.sections?.length) return { ...DEFAULT_FOOTER_CONFIG };

  const defaultsById = new Map(DEFAULT_FOOTER_CONFIG.sections.map((s) => [s.id, s]));

  return {
    showSocial: raw.showSocial ?? DEFAULT_FOOTER_CONFIG.showSocial,
    showContact: raw.showContact ?? DEFAULT_FOOTER_CONFIG.showContact,
    showCopyright: raw.showCopyright ?? DEFAULT_FOOTER_CONFIG.showCopyright,
    sections: raw.sections.map((section) => {
      const fallback = defaultsById.get(section.id);
      return {
        id: section.id,
        title: section.title || fallback?.title || section.id,
        enabled: section.enabled ?? true,
        links: section.links?.length
          ? section.links
          : fallback?.links ?? [],
      };
    }),
  };
}
