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
