"""
Export service: generate CSV shortlists and per-candidate PDF reports.
"""

import csv
import io
from datetime import UTC, datetime


def generate_shortlist_csv(job: object, candidates: list) -> bytes:
    """
    Generate a CSV of all evaluated candidates for a job, sorted by overall score.
    Returns UTF-8 encoded bytes ready to stream as a response.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(
        [
            "Rank",
            "Name",
            "File",
            "Overall Score",
            "Skills",
            "Experience",
            "Education",
            "Domain Fit",
            "Recommendation",
            "Summary",
        ]
    )

    scored = [c for c in candidates if c.status == "done" and c.evaluation]
    scored.sort(key=lambda c: c.evaluation.overall_score, reverse=True)

    for rank, cand in enumerate(scored, 1):
        ev = cand.evaluation
        cs = ev.category_scores or {}
        writer.writerow(
            [
                rank,
                cand.name,
                cand.original_filename,
                f"{ev.overall_score:.1f}",
                f"{cs.get('skills', {}).get('score', '-')}",
                f"{cs.get('experience', {}).get('score', '-')}",
                f"{cs.get('education', {}).get('score', '-')}",
                f"{cs.get('domain_fit', {}).get('score', '-')}",
                ev.recommendation,
                ev.summary,
            ]
        )

    return output.getvalue().encode("utf-8-sig")  # utf-8-sig for Excel compatibility


def generate_candidate_pdf(candidate: object) -> bytes:
    """
    Generate a single-page PDF evaluation report for one candidate.
    Returns PDF bytes.
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        HRFlowable,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    ev = candidate.evaluation  # type: ignore[attr-defined]
    if not ev:
        raise ValueError("Candidate has no evaluation yet")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Symphony violet
    VIOLET = colors.HexColor("#726BFF")
    INK = colors.HexColor("#282C34")

    title_style = ParagraphStyle(
        "MetaHireTitle",
        parent=styles["Heading1"],
        textColor=VIOLET,
        fontSize=20,
        spaceAfter=4,
    )
    heading2_style = ParagraphStyle(
        "MetaHireH2",
        parent=styles["Heading2"],
        textColor=INK,
        fontSize=13,
        spaceBefore=12,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "MetaHireBody",
        parent=styles["Normal"],
        textColor=INK,
        fontSize=10,
        leading=14,
    )
    meta_style = ParagraphStyle(
        "MetaHireMeta",
        parent=styles["Normal"],
        textColor=colors.HexColor("#9090A0"),
        fontSize=9,
    )

    RECOMMENDATION_COLORS = {
        "advance": colors.HexColor("#D1FAE5"),
        "hold": colors.HexColor("#FEF3C7"),
        "reject": colors.HexColor("#FEE2E2"),
    }
    rec_color = RECOMMENDATION_COLORS.get(ev.recommendation, colors.lightgrey)

    story = []

    # Header
    story.append(Paragraph("MetaHire — Candidate Evaluation Report", title_style))
    gen_time = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(f"Generated: {gen_time} &nbsp;|&nbsp; Model: {ev.model}", meta_style))
    story.append(HRFlowable(width="100%", color=VIOLET, thickness=1, spaceAfter=8))

    # Candidate summary
    story.append(Paragraph(f"Candidate: <b>{candidate.name}</b>", heading2_style))  # type: ignore[attr-defined]
    story.append(Paragraph(f"File: {candidate.original_filename}", meta_style))  # type: ignore[attr-defined]
    story.append(Spacer(1, 6))

    # Overall score + recommendation
    rec_table = Table(
        [
            [
                Paragraph(f"Overall Score: <b>{ev.overall_score:.1f} / 100</b>", body_style),
                Paragraph(f"Recommendation: <b>{ev.recommendation.upper()}</b>", body_style),
            ]
        ],
        colWidths=["50%", "50%"],
    )
    rec_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (1, 0), (1, 0), rec_color),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(rec_table)
    story.append(Spacer(1, 8))

    # Category scores table
    story.append(Paragraph("Category Scores", heading2_style))
    cs = ev.category_scores or {}
    cat_data = [["Category", "Score", "Rationale"]]
    for cat in ["skills", "experience", "education", "domain_fit"]:
        data = cs.get(cat, {})
        score = data.get("score", "-") if isinstance(data, dict) else "-"
        rationale = data.get("rationale", "") if isinstance(data, dict) else ""
        cat_data.append(
            [
                cat.replace("_", " ").title(),
                f"{score}/100",
                Paragraph(rationale[:300], body_style),
            ]
        )
    score_table = Table(cat_data, colWidths=[3.5 * cm, 2 * cm, None])
    score_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), VIOLET),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E5E5F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F5FF")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(score_table)

    # Summary
    story.append(Paragraph("Recruiter Summary", heading2_style))
    story.append(Paragraph(ev.summary, body_style))

    # Strengths + Gaps side by side
    story.append(Paragraph("Strengths & Gaps", heading2_style))
    strengths_text = "<br/>".join(f"• {s}" for s in (ev.strengths or []))
    gaps_text = "<br/>".join(f"• {g}" for g in (ev.gaps or []))
    sg_table = Table(
        [
            [
                Paragraph(f"<b>Strengths</b><br/>{strengths_text}", body_style),
                Paragraph(f"<b>Gaps</b><br/>{gaps_text}", body_style),
            ]
        ],
        colWidths=["50%", "50%"],
    )
    sg_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9D9D9")),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#F0FDF4")),
                ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FFF7F7")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(sg_table)

    # Full reasoning
    story.append(Paragraph("Full Reasoning", heading2_style))
    story.append(Paragraph(ev.reasoning, body_style))

    # Footer
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", color=colors.HexColor("#D9D9D9"), thickness=0.5))
    story.append(
        Paragraph(
            "Generated by MetaHire — AI CV Screening & Ranking Tool",
            meta_style,
        )
    )

    doc.build(story)
    return buffer.getvalue()
