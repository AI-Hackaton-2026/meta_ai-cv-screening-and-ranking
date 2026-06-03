import os
import unittest

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

from app.schemas import PromptEvaluationResult
from app.services.claude import CANDIDATE_EVALUATION_PROMPT, _to_evaluation_result


class CandidateEvaluationPromptTests(unittest.TestCase):
    def test_prompt_uses_requested_json_shape(self) -> None:
        self.assertIn('"category_scores"', CANDIDATE_EVALUATION_PROMPT)
        self.assertIn('"rationale"', CANDIDATE_EVALUATION_PROMPT)
        self.assertIn('"requirements_analysis"', CANDIDATE_EVALUATION_PROMPT)
        self.assertIn('"evidence_quote"', CANDIDATE_EVALUATION_PROMPT)
        self.assertIn(
            "Do not reuse the same rationale across categories",
            CANDIDATE_EVALUATION_PROMPT,
        )
        self.assertNotIn(
            "A senior backend engineer in a different stack",
            CANDIDATE_EVALUATION_PROMPT,
        )

    def test_prompt_result_maps_to_app_evaluation_shape(self) -> None:
        prompt_result = PromptEvaluationResult(
            candidate_name="Ada Lovelace",
            category_scores={
                "skills": {
                    "score": 72,
                    "rationale": "Skills show strong API depth but no direct .NET evidence.",
                },
                "experience": {
                    "score": 91,
                    "rationale": "Experience shows senior production ownership.",
                },
                "education": {
                    "score": 80,
                    "rationale": "Education includes relevant technical credentials.",
                },
                "domain_fit": {
                    "score": 64,
                    "rationale": "Domain fit is partial because payment systems transfer partly.",
                },
            },
            requirements_analysis=[
                {
                    "requirement_id": "ID 12",
                    "status": "partial",
                    "evidence_quote": "Built production APIs for payment systems.",
                }
            ],
            key_strengths=["Deep backend ownership"],
            notable_gaps=["No direct .NET evidence"],
            recommendation="hold",
            recruiter_summary="Experienced backend candidate with transferable depth.",
            evaluation_reasoning="The candidate shows strong production ownership.",
        )

        result = _to_evaluation_result(prompt_result)

        self.assertEqual(result.candidate_name, "Ada Lovelace")
        self.assertEqual(result.category_scores.experience.score, 91)
        self.assertEqual(
            result.category_scores.skills.rationale,
            "Skills show strong API depth but no direct .NET evidence.",
        )
        self.assertEqual(
            result.category_scores.experience.rationale,
            "Experience shows senior production ownership.",
        )
        self.assertEqual(result.requirement_matches[0].requirement_id, 12)
        self.assertEqual(
            result.requirement_matches[0].evidence,
            "Built production APIs for payment systems.",
        )
        self.assertEqual(result.strengths, ["Deep backend ownership"])
        self.assertEqual(result.gaps, ["No direct .NET evidence"])
        self.assertEqual(result.summary, "Experienced backend candidate with transferable depth.")
        self.assertEqual(result.reasoning, "The candidate shows strong production ownership.")


if __name__ == "__main__":
    unittest.main()
