import type { Metadata } from "next";

import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
} from "@/components/ui/Card";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/cn";
import { colorStyles } from "@/theme/colors";
import { spacingStyles } from "@/theme/spacing";
import { typographyStyles } from "@/theme/typography";

export const metadata: Metadata = {
  title: "Design System | Atlas",
  description: "Reusable interface primitives for Atlas.",
};

const badgeVariants: readonly BadgeVariant[] = [
  "default",
  "attention",
  "blocked",
  "success",
  "warning",
  "neutral",
];

const buttonVariants: readonly {
  label: string;
  variant: ButtonVariant;
}[] = [
  { label: "Primary", variant: "primary" },
  { label: "Secondary", variant: "secondary" },
  { label: "Ghost", variant: "ghost" },
  { label: "Danger", variant: "danger" },
];

const buttonSizes: readonly ButtonSize[] = ["sm", "md", "lg"];

function CardShowcase() {
  return (
    <Section
      action={<Button size="sm">Section action</Button>}
      description="Padding, tone, compound regions, and hover treatment."
      id="cards"
      title="Cards"
    >
      <div className="grid gap-card lg:grid-cols-2">
        <Card padding="none">
          <CardHeader>
            <Badge variant="neutral">Compound card</Badge>
            <h3
              className={cn(
                typographyStyles.cardTitle,
                colorStyles.text.primary,
              )}
            >
              Weekly overview
            </h3>
          </CardHeader>
          <Divider />
          <CardBody>
            <p
              className={cn(
                typographyStyles.body,
                colorStyles.text.muted,
              )}
            >
              Header, body, and footer remain independently composable.
            </p>
          </CardBody>
          <Divider />
          <CardFooter>
            <Button size="sm">Continue</Button>
            <Button size="sm" variant="ghost">
              Dismiss
            </Button>
          </CardFooter>
        </Card>

        <div className="grid gap-card sm:grid-cols-2">
          <Card padding="sm" tone="subtle">
            <p className={typographyStyles.cardTitle}>Compact</p>
            <p
              className={cn(
                "mt-detail",
                typographyStyles.description,
                colorStyles.text.muted,
              )}
            >
              Small padding and a quiet surface.
            </p>
          </Card>
          <Card padding="lg" tone="accent">
            <p className={typographyStyles.cardTitle}>Spacious</p>
            <p
              className={cn(
                "mt-detail",
                typographyStyles.description,
                colorStyles.text.accent,
              )}
            >
              Large padding with the green accent.
            </p>
          </Card>
          <Card className="sm:col-span-2" hoverable>
            <p className={typographyStyles.cardTitle}>Hoverable</p>
            <p
              className={cn(
                "mt-detail",
                typographyStyles.description,
                colorStyles.text.muted,
              )}
            >
              A restrained border and shadow response for linked cards.
            </p>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function BadgeShowcase() {
  return (
    <Section
      description="Semantic states share one compact shape."
      id="badges"
      title="Badges"
    >
      <Card>
        <div className={spacingStyles.cluster}>
          {badgeVariants.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </Card>
    </Section>
  );
}

function ButtonShowcase() {
  return (
    <Section
      description="Native buttons with visible focus and disabled states."
      id="buttons"
      title="Buttons"
    >
      <Card className="space-y-card-wide">
        <div className={cn(spacingStyles.cluster, "items-center")}>
          {buttonVariants.map(({ label, variant }) => (
            <Button key={variant} variant={variant}>
              {label}
            </Button>
          ))}
        </div>
        <Divider />
        <div className={cn(spacingStyles.cluster, "items-center")}>
          {buttonSizes.map((size) => (
            <Button key={size} size={size} variant="secondary">
              {size.toUpperCase()}
            </Button>
          ))}
          <Button disabled>Disabled</Button>
        </div>
      </Card>
    </Section>
  );
}

function DividerShowcase() {
  return (
    <Section
      description="Dividers preserve structure without adding visual weight."
      id="dividers"
      title="Divider"
    >
      <Card padding="none">
        <CardBody>
          <p className={typographyStyles.cardTitle}>First region</p>
        </CardBody>
        <Divider />
        <CardBody>
          <p className={typographyStyles.cardTitle}>Second region</p>
        </CardBody>
      </Card>
    </Section>
  );
}

function EmptyStateShowcase() {
  return (
    <Section
      description="Empty collections explain what happened and what comes next."
      id="empty-states"
      title="Empty states"
    >
      <EmptyState
        description="Your Inbox is clear. Capture anything you do not want to hold in your head."
        title="No inbox items"
      />
    </Section>
  );
}

export default function DesignSystemPage() {
  return (
    <PageContainer>
      <PageHeader
        description="A compact reference for the reusable surfaces, controls, and status language used throughout Atlas."
        eyebrow="Atlas foundation"
        title="Calm building blocks for focused work."
      />

      <div className="mt-section space-y-section">
        <CardShowcase />
        <BadgeShowcase />
        <ButtonShowcase />
        <DividerShowcase />
        <EmptyStateShowcase />
      </div>
    </PageContainer>
  );
}
