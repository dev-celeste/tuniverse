def transform_top_artists_to_planets(spotify_response: dict):
    planets = []

    artists = spotify_response.get("items", [])

    for index, artist in enumerate(artists):
        planet = {
            "id": artist["id"],
            "name": artist["name"],
            "rank": index + 1,
            "orbit_radius": 100 + (index * 40),
            "planet_size": max(20, 100 - (index * 5)),
            "image_url": artist["images"][0]["url"] if artist["images"] else None,
            "genres": artist.get("genres", []),
        }

        planets.append(planet)

    return {
        "total_planets": len(planets),
        "planets": planets,
    }


def transform_audio_features_to_mood(audio_features_response: dict):
    features = audio_features_response.get("audio_features", [])

    valid_features = [f for f in features if f]

    if not valid_features:
        return {
            "energy": 0,
            "valence": 0,
            "danceability": 0,
            "tempo": 0,
        }

    total_energy = sum(f["energy"] for f in valid_features)
    total_valence = sum(f["valence"] for f in valid_features)
    total_danceability = sum(f["danceability"] for f in valid_features)
    total_tempo = sum(f["tempo"] for f in valid_features)

    count = len(valid_features)

    return {
        "energy": round(total_energy / count, 2),
        "valence": round(total_valence / count, 2),
        "danceability": round(total_danceability / count, 2),
        "tempo": round(total_tempo / count, 1),
    }

