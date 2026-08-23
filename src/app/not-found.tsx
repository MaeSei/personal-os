import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { spacingStyles } from "@/theme/spacing";

export default function NotFound() {
  return (
    <PageContainer className="flex items-center">
      <div className={spacingStyles.contentNarrow}>
        <PageHeader
          description="The page you requested does not exist. Return to the previous screen when you are ready."
          eyebrow="404"
          eyebrowVariant="neutral"
          title="Nothing is here."
        />
      </div>
    </PageContainer>
  );
}
