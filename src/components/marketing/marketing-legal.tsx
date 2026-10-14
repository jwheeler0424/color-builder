import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import {
  MarketingFaq,
  MarketingFaqContent,
  MarketingFaqItem,
  MarketingFaqTrigger,
} from './marketing-primitives';

type LegalSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
};

const LEGAL_CONTACT = 'auto@designersimage.io';
const EFFECTIVE_DATE = 'October 13, 2026';

const PRIVACY_SECTIONS: readonly LegalSection[] = [
  {
    id: 'scope',
    title: 'Who we are and what this policy covers',
    paragraphs: [
      `Designer's Image, based in California, United States, operates Chroma ELITE. In this policy, "we," "us," and "our" mean Designer's Image. This policy explains how information is handled when you visit our website, use the color studio, request color-name matches, or contact us.`,
      `This policy describes the current local-first application. Product pages may describe planned account, subscription, collaboration, cloud-storage, and API services. Those services are not connected to the current studio. We will update this policy and provide any required notices before introducing materially different data practices.`,
    ],
  },
  {
    id: 'information',
    title: 'Information processed when you use Chroma',
    paragraphs: [
      `The studio processes the colors, palette names, images, and settings you choose to use. Current palettes, saved palettes, brand colors, recent colors, gradients, theme variants, and studio preferences are primarily handled in your browser. Local-first does not mean that every request to the website stays on your device.`,
      `Website and server requests necessarily expose connection information such as an IP address, requested URL, browser information, and request time to our hosting infrastructure. Information you send by email includes your email address, message, and any attachments. We use communications to respond to questions, handle requests, and protect the service.`,
    ],
  },
  {
    id: 'browser-storage',
    title: 'Browser storage and the theme cookie',
    paragraphs: [
      `Chroma uses browser local storage to retain palettes and studio settings on the browser/device you are using. This includes the chroma-v4 studio state and browser-local saved-palette records. Local storage is not an account backup and is not automatically synchronized to another browser or device.`,
      `The chroma-theme cookie stores your light, dark, or system-default preference. Its configured lifetime is one year unless it is replaced or deleted sooner. When system default is selected, the app reads the browser's preferred color scheme; it does not need to transmit that preference to choose the displayed theme.`,
      `You can remove local data and the theme cookie through your browser's site-data controls. Removing site data may permanently remove saved palettes and preferences. Disabling storage or cookies may prevent settings from persisting. These storage mechanisms support product functionality rather than advertising profiles.`,
    ],
  },
  {
    id: 'images',
    title: 'Images and local color processing',
    paragraphs: [
      `The current image-extraction tool reads your selected image in the browser using a local object URL, an image element, and canvas processing. It does not upload that image to the Chroma server as part of the extraction workflow. Palette generation and most analysis and export operations also run in the browser, including browser workers.`,
      `Only choose images and other inputs you are entitled to process. Local processing does not protect information you deliberately include in a shared link, an email, a screenshot, or an external service. Third-party browser extensions and device software are outside our control.`,
    ],
  },
  {
    id: 'sharing',
    title: 'Shared palette links',
    paragraphs: [
      `When you use Share, Chroma places palette color values and harmony information in a URL. Anyone with that URL can read and load the encoded palette. Shared links are not private access-controlled documents and may be copied, forwarded, saved, or published by their recipients.`,
      `A URL may appear in browser history, copied messages, request logs, and other services where it is opened or posted. Do not use palette links to transmit confidential or personal information. Clearing your browser data does not revoke copies of an already shared URL.`,
    ],
  },
  {
    id: 'server-requests',
    title: 'Color-name requests and infrastructure',
    paragraphs: [
      `Color-name lookup sends a list of color values to our /api/color-names endpoint so the server can return nearby names from its catalog. The request may contain hexadecimal colors or structured color-space values; it does not need your image, palette title, password, or account identity. The endpoint is separate from the planned paid palette-generation API.`,
      `The endpoint returns responses marked no-store. That response directive does not establish a retention period for hosting, network, or security logs. Our application code does not create a customer account history for these requests. Infrastructure providers may process connection and request information to deliver, maintain, and secure the website.`,
    ],
  },
  {
    id: 'account-prototypes',
    title: 'Prototype account and payment screens',
    paragraphs: [
      `Current sign-in, recovery, and verification screens do not authenticate an account or send a password to a connected authentication service. The prototype sign-up flow forwards the entered email address to a verification-page URL. An email entered there may therefore appear in browser history and in URL/request records even though account registration and email verification are not connected. Avoid entering sensitive information or real credentials into prototype account screens.`,
      `Selecting a paid plan currently records a selection for display; it does not complete a purchase or collect payment-card details. Before account, cloud, or billing services are enabled, we will identify the relevant information collected, service providers, and additional notices or choices required by applicable law.`,
    ],
  },
  {
    id: 'purposes-and-disclosure',
    title: 'How information is used and disclosed',
    paragraphs: [
      `We process information to provide requested color tools, retain preferences, deliver website and color-name requests, respond to communications, troubleshoot errors, prevent abuse, comply with legal obligations, and protect rights and security. Where a legal basis is required, the basis may be providing a requested service, our legitimate interests subject to your rights, compliance with law, or your consent when required.`,
      `Hosting and communications providers may process information on our behalf. We may disclose information when legally required, to address fraud or security issues, to protect rights, or in a business transfer subject to applicable safeguards and notice requirements. We do not configure the current application to sell personal information, share it for cross-context behavioral advertising, or run third-party advertising trackers. This statement is not a claim that hosting providers never create operational logs.`,
    ],
  },
  {
    id: 'retention-security',
    title: 'Retention, security, and international processing',
    paragraphs: [
      `Browser-local records remain until you delete them, clear site data, or your browser removes them. The theme cookie expires according to its configured lifetime. Information received through communications or infrastructure is retained only as needed for its purpose, security, legal obligations, and resolving disputes; actual retention varies by the information and provider involved. We do not promise that a shared link or a recipient's copy can be deleted remotely.`,
      `We use reasonable measures appropriate to the service to protect information, but no website, device, or transmission is completely secure. Do not provide confidential information that the tools do not require. Information handled by our service providers may be processed in the United States or another country, subject to applicable transfer requirements and safeguards.`,
    ],
  },
  {
    id: 'rights',
    title: 'Your choices and privacy rights',
    paragraphs: [
      `Depending on where you live and which laws apply, you may have rights to access, correct, delete, obtain a copy of, or restrict certain personal information; object to certain processing; or withdraw consent without affecting prior lawful processing. You can exercise direct control over browser-local information by exporting needed work and deleting the relevant browser site data. We cannot retrieve information stored only in your browser for you.`,
      `California residents may have rights under the California Consumer Privacy Act and other applicable laws where those laws apply to the business and processing involved. These may include knowing, deleting, correcting, and opting out of a sale or sharing of personal information, and protection from unlawful discrimination for exercising rights. The current app does not sell or share personal information for cross-context behavioral advertising. We will respect applicable opt-out signals if processing subject to those requirements is introduced.`,
      `Contact us to request help with information we actually hold. We may need reasonable information to verify a request or an authorized agent's authority, and legal exceptions may apply. Do not send passwords or unnecessary identity documents. You may also have a right to complain to a privacy regulator in your jurisdiction.`,
    ],
  },
  {
    id: 'children',
    title: 'Children and users under 18',
    paragraphs: [
      `Chroma ELITE is not directed to children under 13. Users aged 13 to 17 may use the service only with permission and appropriate supervision from a parent or legal guardian. We do not knowingly request personal information from children under 13.`,
      `If you believe a child under 13 has provided personal information to us, contact us so we can investigate and take appropriate action. Where local law requires a different age or a specific form of parental consent for a particular activity, that law controls.`,
    ],
  },
  {
    id: 'external-services',
    title: 'External websites and changes to this policy',
    paragraphs: [
      `Websites or services reached through external links have their own privacy practices. This policy does not govern their processing. Review their notices before submitting information to them.`,
      `We may update this policy as the product or legal requirements change. The effective date will identify the current version. For material changes, we will provide any additional notice or consent opportunity required by law rather than treating continued use as a substitute for consent where consent is required.`,
    ],
  },
];

const TERMS_SECTIONS: readonly LegalSection[] = [
  {
    id: 'agreement',
    title: 'The service and this agreement',
    paragraphs: [
      `These Terms of Use govern access to Chroma ELITE, its website, local-first color studio, and currently available related tools, operated by Designer's Image in California, United States. "You" means the person using the service or, if authorized, the organization on whose behalf that person acts. Our Privacy Policy explains how information is handled.`,
      `Please read these terms before using the service. By using the service, you agree to these terms to the extent permitted by applicable law. If you do not agree, do not use the service. If you act for an organization, you must have authority to bind it. Nothing here excludes rights that cannot lawfully be waived.`,
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility and parental permission',
    paragraphs: [
      `You must be at least 13 to use Chroma ELITE. If you are under 18, you must have your parent or legal guardian's permission, and they should review these terms with you. If applicable law requires a higher age or an additional form of consent, you must meet that requirement.`,
      `A parent or guardian permitting use is responsible for supervising that use as required by law. Do not misrepresent your age or identity or use the service if you are prohibited from doing so by applicable law.`,
    ],
  },
  {
    id: 'availability',
    title: 'Current features and planned services',
    paragraphs: [
      `The currently available studio primarily works in your browser. Account authentication, email verification, password recovery, paid checkout, cloud synchronization, team collaboration, and the advertised paid API are not connected to the current studio. Examples, plan descriptions, and selection messages are not confirmation that those services are available or that a transaction has occurred.`,
      `We may improve, change, limit, or discontinue features. Where notice is legally required or necessary for an active paid agreement, we will provide it. We do not promise uninterrupted availability, a particular release date for planned features, or permanent compatibility with every device, browser, profile, or export format.`,
    ],
  },
  {
    id: 'permission-to-use',
    title: 'Permission to use the tools',
    paragraphs: [
      `Subject to these terms, you may use the available studio and export its outputs for your personal or commercial projects. This permission does not transfer ownership of our branding, website design, software, or content, and it does not override third-party rights or applicable software and asset licenses.`,
      `You may not use our trademarks or logo in a way that suggests sponsorship or endorsement without authorization. Open-source libraries, fonts, datasets, or other components may be governed by separate licenses; those licenses continue to apply.`,
    ],
  },
  {
    id: 'inputs-outputs',
    title: 'Your inputs, palettes, and outputs',
    paragraphs: [
      `You retain any rights you have in images, colors, palette names, brand materials, and other content you provide. You must own or have permission to use those inputs. Processing an image locally does not grant permission to copy or reuse someone else's work.`,
      `We do not claim ownership of your palettes or exported outputs merely because you use the tools. You are responsible for reviewing outputs and obtaining any permissions needed for your intended use. Colors, color names, generated palettes, and outputs may not be unique, protectable, free of trademark references, or suitable for every purpose. A catalog color name is not a license to use a third-party name, mark, or brand.`,
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use and service integrity',
    paragraphs: [
      `Use the service lawfully and respect other people's rights. Do not introduce malicious code, attack the website or its infrastructure, access systems or information without permission, impersonate another person, or use the service to facilitate fraud or unlawful activity.`,
      `Do not bypass security, technical limits, or access controls; interfere with other users; or make automated requests that overload the service. Any future API access must follow its published authentication, quotas, and permitted-use rules. Where law gives you a non-waivable right to a particular activity, these terms do not remove that right.`,
    ],
  },
  {
    id: 'saving-sharing',
    title: 'Local saving, backups, and shared links',
    paragraphs: [
      `Browser-local saving is not guaranteed backup or account storage. Your work may be lost if site data is cleared, storage is unavailable, a browser profile changes, or a device is lost. Keep independent exports or backups of work you need to retain. We cannot recover records that exist only in your browser.`,
      `Sharing a palette places color and harmony values in a URL accessible to anyone who receives it. You are responsible for choosing what to share and with whom. Shared links are not confidential, do not provide access restrictions, and cannot be revoked from recipients' copies by deleting your local palette.`,
    ],
  },
  {
    id: 'payments',
    title: 'Prices, paid plans, and future subscriptions',
    paragraphs: [
      `The current pricing page describes plans and records plan selections only. Selecting Pro or Team does not process payment, create a paid account, or start a subscription. Do not treat a selection notice as an invoice, receipt, or entitlement to a feature that is not yet enabled.`,
      `If paid services are introduced, checkout must identify the actual price, taxes, billing interval, renewal terms, cancellation process, and any applicable refund policy before you agree to purchase. Additional service-specific terms may apply with appropriate notice. These terms do not impose an undisclosed recurring charge or override mandatory cancellation or refund rights.`,
    ],
  },
  {
    id: 'accuracy',
    title: 'Color accuracy and accessibility checks',
    paragraphs: [
      `Color calculations, simulations, previews, names, and recommendations are tools for design decisions, not certifications or guarantees. Results can vary with color space, display gamut, device calibration, lighting, fonts, background pairings, print profiles, and implementation. Validate exports in the environment where they will be used.`,
      `Contrast ratios, APCA results, color-vision simulations, and scoring do not by themselves establish compliance with an accessibility standard or law. Review the actual foreground/background pairing, text size and weight, interaction states, and complete user experience. You remain responsible for evaluating suitability and compliance for your project.`,
    ],
  },
  {
    id: 'third-parties',
    title: 'Third-party services and content',
    paragraphs: [
      `External websites, services, software, and content are operated or licensed by their respective providers. We do not control their availability, policies, or suitability, and a link or reference is not an endorsement. Your use of them may be subject to additional terms.`,
      `If you send information to another service, use a browser extension, or publish an exported file or palette link elsewhere, review the relevant terms and privacy practices. We are not responsible for actions independently taken by a third party except where applicable law makes us responsible.`,
    ],
  },
  {
    id: 'disclaimers-liability',
    title: 'Disclaimers and limits of liability',
    paragraphs: [
      `To the extent permitted by law, the service is provided "as is" and "as available," without warranties of uninterrupted operation, merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that every result is accurate or that local data can be recovered. Applicable statutory warranties and non-waivable consumer protections remain in effect.`,
      `To the extent permitted by law, Designer's Image is not liable for indirect, incidental, special, or consequential losses resulting from use of the service. Our aggregate liability for claims relating to the service is limited to the greater of US$100 or the amount you actually paid us for the service during the twelve months before the event giving rise to the claim. These exclusions and limits do not apply to liability that cannot lawfully be excluded or limited, including protections applicable to fraud, willful misconduct, or other conduct for which the law prohibits a limitation.`,
    ],
  },
  {
    id: 'ending-use',
    title: 'Ending use and access restrictions',
    paragraphs: [
      `You may stop using the service at any time and delete browser-local data through your browser's settings. Stopping use does not delete shared links held by others or information independently retained by other services.`,
      `We may restrict service access where reasonably necessary to address misuse, security risk, legal requirements, or material violations of these terms, subject to applicable law and any active paid agreement. Provisions that by their nature should survive ending use, including ownership, liability, and dispute provisions, continue to apply where enforceable.`,
    ],
  },
  {
    id: 'law-and-changes',
    title: 'Applicable law, disputes, and changes',
    paragraphs: [
      `These terms are governed by California law, excluding conflict-of-law rules, except where mandatory consumer protections or other applicable laws require otherwise. Any legal proceedings must be brought in a court with appropriate jurisdiction; this clause does not remove a mandatory right to use a court or regulator in your own jurisdiction. These terms do not require arbitration or waive participation in a class action.`,
      `You are welcome to contact us to try to resolve a concern informally, without giving up legal rights or deadlines. We may update these terms to reflect product changes or legal requirements and will update the effective date. Material changes will receive any notice or acceptance process required by law. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law.`,
    ],
  },
];

function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy';
  const title = privacy ? 'Privacy Policy' : 'Terms of Use';
  const sections = privacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const [contentsOpen, setContentsOpen] = useState<string[]>([]);
  const contents = (
    <ol className='m-0 grid gap-y-[11px] pl-[18px] text-xs leading-[1.5] text-(--muted-foreground) max-[800.01px]:grid-cols-2 max-[800.01px]:gap-x-7 max-[800.01px]:gap-y-3 max-[560.01px]:grid-cols-1'>
      {sections.map((section) => (
        <li key={section.id}>
          <a
            className='text-(--muted-foreground) no-underline hover:text-(--brand-teal-ink)'
            href={`#${kind}-${section.id}`}
            onClick={() => setContentsOpen([])}>
            {section.title}
          </a>
        </li>
      ))}
      <li>
        <a
          className='text-(--muted-foreground) no-underline hover:text-(--brand-teal-ink)'
          href={`#${kind}-contact`}
          onClick={() => setContentsOpen([])}>
          Contact
        </a>
      </li>
    </ol>
  );

  return (
    <main
      className={cn(
        'min-w-0 flex-[1_0_auto] [--page-gutter:clamp(24px,3vw,72px)] max-[960px]:[--page-gutter:clamp(16px,2.7vw,28px)] max-[800px]:[--page-gutter:18px]',
        'w-full px-(--page-gutter) py-12 pb-[72px] max-[560.01px]:py-8 max-[560.01px]:pb-12',
        '[&_a]:text-(--brand-teal-ink) [&_a]:underline [&_a]:underline-offset-[3px]',
        'marketing-page-legal',
      )}>
      <header
        data-legal-heading
        className='mx-[calc(var(--page-gutter)*-1)] border-b border-border bg-[color-mix(in_srgb,var(--card)_94%,var(--brand-teal-ink))] px-(--page-gutter) pt-[clamp(32px,4vw,58px)] pb-8 max-[560.01px]:pt-8 max-[560.01px]:pb-6'>
        <p className='m-0 inline-flex items-center gap-[9px] font-display text-2xs font-semibold tracking-[0] text-muted-foreground uppercase'>
          Designer's Image / Chroma ELITE
        </p>
        <h1 className='mt-3.5 mb-0 font-display text-[42px] leading-[1.1] font-bold max-[560.01px]:text-[32px]'>
          {title}
        </h1>
        <p className='mt-4 mb-0 max-w-[62ch] text-[15px] leading-[1.7] text-(--muted-foreground)'>
          {privacy
            ? 'How information is handled in the Chroma website and local-first studio.'
            : 'The conditions for using Chroma color tools, the website, and available services.'}
        </p>
        <dl className='legal-page-meta mt-6 mb-0 flex flex-wrap gap-x-8 gap-y-3.5 text-xs leading-[1.6]'>
          <div>
            <dt className='text-(--muted-foreground)'>Effective</dt>
            <dd className='mx-0 mt-0.75 mb-0'>
              <time dateTime='2026-10-13'>{EFFECTIVE_DATE}</time>
            </dd>
          </div>
          <div>
            <dt className='text-(--muted-foreground)'>Operator</dt>
            <dd className='mx-0 mt-0.75 mb-0'>Designer's Image, California, United States</dd>
          </div>
          <div>
            <dt className='text-(--muted-foreground)'>Contact</dt>
            <dd className='mx-0 mt-0.75 mb-0'>
              <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>
            </dd>
          </div>
        </dl>
        <div className='legal-related-links mt-6 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold'>
          <Link
            to='/privacy'
            aria-current={privacy ? 'page' : undefined}
            className={privacy ? 'text-(--foreground)' : undefined}>
            Privacy Policy
          </Link>
          <Link
            to='/terms'
            aria-current={!privacy ? 'page' : undefined}
            className={!privacy ? 'text-(--foreground)' : undefined}>
            Terms of Use
          </Link>
          <Link to='/support' hash='data'>
            Data overview
          </Link>
        </div>
      </header>
      <div
        data-legal-layout
        className='grid grid-cols-[clamp(240px,16vw,340px)_minmax(0,1fr)] items-start gap-[clamp(36px,4vw,88px)] pt-[clamp(36px,4vw,64px)] max-[800.01px]:grid-cols-1 max-[800.01px]:gap-8 max-[800.01px]:pt-7'>
        <nav
          aria-label={`${title} contents`}
          className='legal-desktop-contents sticky top-6 min-w-0 border-r border-border pr-[clamp(20px,2vw,36px)] max-[800.01px]:static max-[800.01px]:hidden max-[800.01px]:border-r-0 max-[800.01px]:border-b max-[800.01px]:pr-0 max-[800.01px]:pb-6'>
          <h2 className='mb-3.5 font-mono text-2xs font-bold text-(--brand-teal-ink) uppercase'>
            On this page
          </h2>
          {contents}
        </nav>
        <MarketingFaq
          value={contentsOpen}
          onValueChange={setContentsOpen}
          className='legal-mobile-contents'>
          <MarketingFaqItem value='contents'>
            <MarketingFaqTrigger>On this page</MarketingFaqTrigger>
            <MarketingFaqContent>
              <nav
                aria-label={`${title} contents`}
                className='legal-mobile-list min-w-0 border-0 p-0'>
                {contents}
              </nav>
            </MarketingFaqContent>
          </MarketingFaqItem>
        </MarketingFaq>
        <article
          aria-label={title}
          className='max-w-none min-w-0 columns-[32rem] gap-x-[clamp(36px,4vw,80px)] max-[960.01px]:columns-1 [&_a]:[overflow-wrap:anywhere]'>
          {sections.map((section) => (
            <section
              key={section.id}
              id={`${kind}-${section.id}`}
              className='mb-8 scroll-mt-6 break-inside-avoid-column'>
              <h2 className='m-0 mb-3 [break-after:avoid] font-display text-[22px] leading-[1.3] font-bold max-[560.01px]:text-[20px]'>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className='mt-0 mb-[14px] max-w-[110ch] text-sm leading-[1.85] [overflow-wrap:anywhere] text-(--muted-foreground)'>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          <section id={`${kind}-contact`} className='mb-8 scroll-mt-6 break-inside-avoid-column'>
            <h2 className='m-0 mb-3 [break-after:avoid] font-display text-[22px] leading-[1.3] font-bold max-[560.01px]:text-[20px]'>
              Contact
            </h2>
            <p className='mt-0 mb-[14px] max-w-[110ch] text-sm leading-[1.85] [overflow-wrap:anywhere] text-(--muted-foreground)'>
              For {privacy ? 'privacy questions and requests' : 'questions about these terms'},
              contact Designer's Image at <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
              Please identify Chroma ELITE and describe your request without sending passwords or
              unnecessary sensitive information.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}

export function PrivacyPolicyPage() {
  return <LegalPage kind='privacy' />;
}

export function TermsOfUsePage() {
  return <LegalPage kind='terms' />;
}
