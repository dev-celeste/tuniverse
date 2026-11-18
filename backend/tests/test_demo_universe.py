from demo.universe import OUTPUT_PATH, build_demo_universe, render


def test_committed_demo_universe_is_up_to_date():
    # If this fails, regenerate: cd backend && .venv/bin/python -m demo.universe
    assert OUTPUT_PATH.read_text(encoding="utf-8") == render(build_demo_universe())


def test_demo_universe_shows_off_every_feature():
    universe = build_demo_universe()

    for time_range, data in universe["ranges"].items():
        planets = data["galaxy"]["planets"]
        assert len(planets) == 10, time_range
        assert len(data["top_tracks"]["tracks"]) == 20, time_range
        # At least one moonless planet, so that state is visible
        assert any(not p["moons"] for p in planets), time_range

    moods = {p["mood"] for data in universe["ranges"].values() for p in data["galaxy"]["planets"]}
    assert {"Aggressive", "Fiery", "Euphoric", "Reflective", "Confident", "Upbeat", "Intense"} <= moods
