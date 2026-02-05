import defaultMdxComponents from 'fumadocs-ui/mdx';
import { MCPInstallButtons } from '@/components/MCPInstallButtons';

// MDXComponents type from fumadocs
type MDXComponents = typeof defaultMdxComponents;

export function useMDXComponents(components?: Partial<MDXComponents>): MDXComponents {
  return {
    ...defaultMdxComponents,
    MCPInstallButtons,
    ...components,
  } as MDXComponents;
}
