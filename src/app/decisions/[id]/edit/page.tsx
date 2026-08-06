import { EditDecisionView } from '@/components/decision/EditDecisionView';

/**
 * Server Component. params에서 id 문자열만 꺼내 Client에 넘긴다.
 *
 * 상세 페이지와 완전히 같은 모양이다. 서버가 할 수 있는 일이
 * URL 해석뿐이라는 제약이 두 페이지에서 똑같이 나타난다.
 */
export default async function EditDecisionPage(
  props: PageProps<'/decisions/[id]/edit'>,
) {
  const { id } = await props.params;

  return <EditDecisionView id={id} />;
}
