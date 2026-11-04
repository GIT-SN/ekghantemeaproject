"""ResumeJudge - Python / scikit-learn version of the star-rating model.

Algorithm: Multinomial Naive Bayes (sklearn.naive_bayes.MultinomialNB, Laplace alpha=1.0)
Two models are compared:
  A) Baseline  : bag-of-words from resume text only
  B) ResumeJudge: words + ATS feature tokens (same tokens used by the JavaScript model in src/nb.js)

Usage:
    npm run export:data          # creates ml/data/train.csv and test.csv
    pip install -r ml/requirements.txt
    python ml/train.py
"""
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.naive_bayes import MultinomialNB

ROOT = Path(__file__).parent
train = pd.read_csv(ROOT / "data" / "train.csv")
test = pd.read_csv(ROOT / "data" / "test.csv")
lines = [f"Train rows: {len(train)} | Test rows: {len(test)}", ""]


def run(name, column, token_pattern):
    vec = CountVectorizer(token_pattern=token_pattern, lowercase=True)
    X_train = vec.fit_transform(train[column])
    model = MultinomialNB(alpha=1.0).fit(X_train, train["stars"])
    pred = model.predict(vec.transform(test[column]))
    exact = accuracy_score(test["stars"], pred)
    within1 = (abs(pred - test["stars"]) <= 1).mean()
    lines.extend([
        f"=== {name} ===",
        f"Exact accuracy: {exact:.1%} | Within +-1 star: {within1:.1%}",
        "Confusion matrix (rows=true 1-5 stars, cols=predicted):",
        str(confusion_matrix(test["stars"], pred)),
        classification_report(test["stars"], pred, zero_division=0),
    ])
    return vec, model, pred


run("A) Baseline: text words only", "text", r"(?u)\b[a-zA-Z][a-zA-Z+#.]{2,}\b")
vec, model, pred = run("B) ResumeJudge: words + ATS feature tokens", "tokens", r"\S+")

report = "\n".join(lines)
print(report)
(ROOT / "report.txt").write_text(report, encoding="utf-8")
joblib.dump({"vectorizer": vec, "model": model}, ROOT / "model.joblib")

try:  # optional confusion-matrix image
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from sklearn.metrics import ConfusionMatrixDisplay
    ConfusionMatrixDisplay.from_predictions(test["stars"], pred, cmap="Blues")
    plt.title("Naive Bayes star rating - confusion matrix")
    plt.savefig(ROOT / "confusion_matrix.png", dpi=150, bbox_inches="tight")
except ImportError:
    pass
print("\nSaved: ml/report.txt, ml/model.joblib, ml/confusion_matrix.png")
