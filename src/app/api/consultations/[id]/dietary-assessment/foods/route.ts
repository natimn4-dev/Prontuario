import { NextResponse } from "next/server";
import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import { DietaryAssessmentError, searchDietaryFoods } from "@/server/clinical/dietary-assessment";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withConsultationPatientAccess(id, async () => {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ foods: [] }, { headers: { "Cache-Control": "private, no-store" } });
    try {
      const foods = await searchDietaryFoods(query);
      return NextResponse.json({
        foods: foods.map((food) => ({
          provider: food.provider,
          sourceId: food.sourceId,
          description: food.description,
          dataType: food.dataType,
          sourceVersion: food.sourceVersion,
        })),
      }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      if (error instanceof DietaryAssessmentError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
      }
      return NextResponse.json({ error: "Falha ao consultar a base de alimentos." }, { status: 500 });
    }
  });
}
