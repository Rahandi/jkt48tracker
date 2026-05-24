"""add generation column to members

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Static generation map: jkt48_id -> generation string
GENERATION_DATA = {
    "abigail-rachel-1":        "12",
    "adeline-wijaya-2":        "12",
    "afera-thalia-6":          "14",
    "alya-amanda-13":          "11",
    "angelina-christy-22":     "7",
    "anindya-ramadhani-26":    "11",
    "astrella-virgiananda-28": "13",
    "aulia-riza-30":           "13",
    "aurellia-31":             "10",
    "aurhel-alana-33":         "12",
    "bong-aprilli-39":         "13",
    "carissa-dini-43":         "14",
    "catherina-vallencia-44":  "12",
    "cathleen-nixie-45":       "11",
    "celline-thefani-46":      "11",
    "chelsea-davina-48":       "11",
    "christabella-bonita-52":  "14",
    "cornelia-vanisa-59":      "8",
    "cynthia-yaputera-60":     "11",
    "dena-natalia-64":         "11",
    "desy-natalia-67":         "11",
    "fahira-putri-82":         "14",
    "fatimah-azzahra-85":      "14",
    "febriola-sinambela-88":   "7",
    "feni-fitriyanti-89":      "3",
    "fiony-alveria-91":        "8",
    "freya-jayawardana-94":    "7",
    "fritzy-rosmerian-96":     "12",
    "gabriela-abigail-97":     "10",
    "gendis-mayrannisa-102":   "11",
    "gita-sekar-andarini-104": "6",
    "grace-octaviani-105":     "11",
    "greesella-adhalia-107":   "11",
    "hagia-sopia-108":         "13",
    "heidi-suyangga-111":      "14",
    "helisma-putri-112":       "7",
    "hillary-abigail-114":     "12",
    "humaira-ramadhani-115":   "13",
    "indah-cahya-116":         "9",
    "isha-kirana-119":         "jkt48v-2",
    "jacqueline-immanuela-120":"13",
    "jazzlyn-trisha-121":      "12",
    "jemima-evodie-123":       "13",
    "jessica-chandra-127":     "7",
    "jesslyn-elly-131":        "10",
    "kathrina-irene-143":      "9",
    "lulu-salsabila-148":      "8",
    "marsha-lenathea-152":     "9",
    "maura-nilambari-154":     "jkt48v-2",
    "maxine-faye-155":         "14",
    "michelle-alexandra-159":  "11",
    "michelle-levia-161":      "12",
    "mikaela-kusjanto-162":    "13",
    "mutiara-azzahra-166":     "7",
    "nayla-suji-175":          "12",
    "nina-tutachia-178":       "12",
    "nur-intan-182":           "13",
    "oline-manuel-185":        "12",
    "pia-meraleo-187":         "jkt48v-1",
    "putry-jazyta-194":        "14",
    "raisha-syifa-195":        "10",
    "ralyne-van-irwan-196":    "14",
    "ribka-budiman-204":       "12",
    "sami-maono-217":          "jkt48v-2",
    "shabilqis-naila-221":     "12",
    "sona-kalyana-231":        "14",
    "tana-nona-238":           "jkt48v-1",
    "victoria-kimberly-244":   "12",
}


def upgrade() -> None:
    op.add_column('members', sa.Column('generation', sa.String(length=20), nullable=True))

    conn = op.get_bind()
    for jkt48_id, generation in GENERATION_DATA.items():
        conn.execute(
            sa.text("UPDATE members SET generation = :gen WHERE jkt48_id = :jid"),
            {"gen": generation, "jid": jkt48_id},
        )


def downgrade() -> None:
    op.drop_column('members', 'generation')
