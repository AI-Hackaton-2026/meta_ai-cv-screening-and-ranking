import os
import unittest

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")

from app.services.scoring import compute_overall_score


class ComputeOverallScoreTests(unittest.TestCase):
    def test_experience_heavy_weights_preserve_senior_transferable_experience(self) -> None:
        weights = {"skills": 6, "experience": 84, "education": 5, "domain_fit": 5}
        senior_python_backend = {
            "skills": {"score": 45},
            "experience": {"score": 95},
            "education": {"score": 75},
            "domain_fit": {"score": 45},
        }
        junior_dotnet_backend = {
            "skills": {"score": 92},
            "experience": {"score": 35},
            "education": {"score": 70},
            "domain_fit": {"score": 88},
        }

        senior_score = compute_overall_score(senior_python_backend, weights)
        junior_score = compute_overall_score(junior_dotnet_backend, weights)

        self.assertGreater(senior_score, junior_score)
        self.assertEqual(senior_score, 88.5)
        self.assertEqual(junior_score, 42.8)

    def test_custom_weights_do_not_backfill_missing_categories_with_defaults(self) -> None:
        category_scores = {
            "skills": {"score": 100},
            "experience": {"score": 50},
            "education": {"score": 100},
            "domain_fit": {"score": 100},
        }

        self.assertEqual(compute_overall_score(category_scores, {"experience": 100}), 50.0)

    def test_missing_category_score_counts_as_zero_instead_of_dropping_weight(self) -> None:
        category_scores = {"skills": {"score": 100}}

        self.assertEqual(compute_overall_score(category_scores, None), 35.0)


if __name__ == "__main__":
    unittest.main()
