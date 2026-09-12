# -*- coding: utf-8 -*-
"""茶タヌキ試作1号 / Blender 5.2.1

使い方: Scripting → Text Editor の Open でこのファイルを開き、Run Script。
現在のシーンのオブジェクトを整理して、茶タヌキ1体と撮影セットを生成します。
保存・書き出し・アニメーションは行いません。外部素材や追加アドオンは不要です。
F12: 撮影画像。テンキー1/3/7: 正面/側面/上面。テンキー0: カメラ。
参照: デザイン比較案の左上 A「ノーマル（茶タヌキ）」の静止4方向図。
前方は -Y、上方は +Z。各部は独立オブジェクト、まとまりは Empty に親子付け。
下の SETTINGS と PARTS を変更して再実行すると、形を調整できます。
"""

import math
import bpy
import bmesh
from mathutils import Vector


SETTINGS = {
    "head_scale": 0.92,
    "body_scale": 1.0,
    "tail_scale": 1.0,
    "leaf_scale": 1.0,
    "eye_spacing": 0.39,
    "bevel_segments": 2,  # 少ない面数で、平らな面と少しの丸みを残す
    "render_size": 1000,
}

# 位置 (X,Y,Z)、寸法 (幅,奥行,高さ)、角の丸み。
PARTS = {
    "head": ((0, 0, 2.178), (2.12, 1.50, 1.54), 0.30),
    "body": ((0, 0.04, 0.91), (1.06, 0.85, 1.24), 0.21),
    "face": ((0, -0.785, 2.18), (1.60, 0.14, 0.95), 0.18),
    "belly": ((0, -0.405, 0.89), (0.73, 0.105, 0.82), 0.12),
}

COLORS = {
    "fur": "B5753C", "body": "AD6D35", "rim": "CC8A49",
    "dark": "60402D", "ear_inner": "855434", "screen": "17272C",
    "eye": "80E6F3", "cream": "F3D8AC", "muzzle": "F7EEDD",
    "nose": "302A24", "leaf": "61A936", "leaf_light": "79BB45",
    "leaf_dark": "45802A", "ground": "EAE5DB",
}

PREFIX = "TANUKI_01_"


def material(key):
    name = PREFIX + key
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    h = COLORS[key]
    rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    rgba = (*linear, 1)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    shader = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
    out = mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
    mat.node_tree.links.new(shader.outputs["BSDF"], out.inputs["Surface"])
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Roughness"].default_value = 0.76
    if key == "screen":
        shader.inputs["Roughness"].default_value = 0.46
    if key == "eye":
        shader.inputs["Emission Color"].default_value = rgba
        shader.inputs["Emission Strength"].default_value = 0.45
    return mat


def clean_scene(scene):
    # 現在のシーンのみ整理。別シーンで共有している物はそちらに残す。
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    scene.camera = None
    for obj in list(scene.objects):
        shared = any(other != scene and obj.name in other.objects for other in bpy.data.scenes)
        if shared:
            scene.collection.objects.link(obj) if obj.name not in scene.collection.objects else None
        else:
            bpy.data.objects.remove(obj, do_unlink=True)
    for obj in list(scene.collection.objects):
        scene.collection.objects.unlink(obj)
    for col in list(scene.collection.children):
        scene.collection.children.unlink(col)
        if col.users == 0 and col.name.startswith(PREFIX):
            bpy.data.collections.remove(col)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for data in list(datablocks):
            if data.users == 0 and data.name.startswith(PREFIX):
                datablocks.remove(data)


def empty(name, collection, parent=None, location=(0, 0, 0), scale=1):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    obj.scale = (scale,) * 3
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.16
    return obj


def mesh_object(name, verts, faces, collection, mat, parent=None):
    mesh = bpy.data.meshes.new(PREFIX + name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def box(name, location, dimensions, bevel, mat, collection, parent=None, rotation=(0, 0, 0)):
    x, y, z = [d / 2 for d in dimensions]
    verts = [(-x,-y,-z), (x,-y,-z), (x,y,-z), (-x,y,-z),
             (-x,-y,z), (x,-y,z), (x,y,z), (-x,y,z)]
    faces = [(0,3,2,1), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    obj = mesh_object(name, verts, faces, collection, mat, parent)
    obj.location = location
    obj.rotation_euler = tuple(math.radians(v) for v in rotation)
    if bevel:
        mod = obj.modifiers.new("角の丸み（調整可）", "BEVEL")
        mod.width = bevel
        mod.segments = SETTINGS["bevel_segments"]
        # 薄い顔面でも、正面の輪郭を十分に丸めるため角丸は別形状で作る。
    return obj


def panel(name, location, width, height, depth, radius, mat, collection, parent=None):
    # XZ平面上の角丸輪郭を押し出す。薄さで角丸半径が制限されない。
    outline = []
    for cx, cz, start in [(width/2-radius,height/2-radius,0),
                          (-width/2+radius,height/2-radius,90),
                          (-width/2+radius,-height/2+radius,180),
                          (width/2-radius,-height/2+radius,270)]:
        for i in range(4):
            a = math.radians(start + i * 30)
            outline.append((cx + radius * math.cos(a), cz + radius * math.sin(a)))
    n = len(outline)
    verts = [(x, y, z) for y in (-depth/2, depth/2) for x,z in outline]
    faces = [tuple(range(n-1,-1,-1)), tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    obj = mesh_object(name, verts, faces, collection, mat, parent)
    obj.location = location
    return obj


def line(name, points, radius, mat, collection, parent):
    data = bpy.data.curves.new(PREFIX + name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 1
    spline = data.splines.new("POLY")
    spline.points.add(len(points)-1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    obj = bpy.data.objects.new(name, data)
    collection.objects.link(obj)
    data.materials.append(mat)
    obj.parent = parent
    return obj


def make_tail(collection, parent, mats):
    # 根元から先まで一続きの閉じたメッシュ。面ごとに帯の色を割り当てる。
    stations = [(0.00,.17), (.18,.28), (.38,.36), (.61,.39),
                (.83,.38), (1.05,.33), (1.22,.24), (1.32,.12)]
    verts = []
    sides = 12
    for t, radius in stations:
        center = Vector((0, t, .30*t + .08*t*t))
        tangent = Vector((0,1,.30+.16*t)).normalized()
        vertical = Vector((0,-tangent.z,tangent.y))
        for j in range(sides):
            a = 2*math.pi*j/sides
            verts.append(tuple(center + Vector((1,0,0))*math.cos(a)*radius
                               + vertical*math.sin(a)*radius))
    faces = [tuple(reversed(range(sides)))]
    for i in range(len(stations)-1):
        for j in range(sides):
            faces.append((i*sides+j, i*sides+(j+1)%sides,
                          (i+1)*sides+(j+1)%sides, (i+1)*sides+j))
    faces.append(tuple(range((len(stations)-1)*sides,len(stations)*sides)))
    obj = mesh_object("Tail_尻尾", verts, faces, collection, mats["fur"], parent)
    obj.data.materials.append(mats["dark"])
    bands = [0,0,1,0,1,0,1]
    for poly in obj.data.polygons:
        poly.material_index = (1 if poly.index == len(faces)-1 else
                               bands[(poly.index-1)//sides] if poly.index else 0)
    return obj


def make_leaf(collection, parent, mats):
    # 頭に寝かせた小さな一枚葉。左右の面と中央の折り目を明確にする。
    outline = [(-.28,-.30,.02), (-.43,-.09,.08), (-.35,.17,.15),
               (-.08,.34,.21), (.34,.42,.28), (.32,.10,.15), (.11,-.19,.06)]
    verts = outline + [(-.06,.04,.23)] + [(x,y,z-.045) for x,y,z in outline]
    n = len(outline)
    faces = [(i,(i+1)%n,n) for i in range(n)]
    faces += [tuple(range(n+1,2*n+1))]
    faces += [(i,n+1+i,n+1+(i+1)%n,(i+1)%n) for i in range(n)]
    obj = mesh_object("Leaf_葉っぱ", verts, faces, collection, mats["leaf"], parent)
    obj.data.materials.append(mats["leaf_light"])
    obj.data.materials.append(mats["leaf_dark"])
    for p in obj.data.polygons:
        p.material_index = (p.index % 2) if p.index < n else 2
    line("LeafVein_葉の折り目", [(-.28,-.30,.045),(-.06,.04,.24),(.34,.42,.285)],
         .012, mats["leaf_dark"], collection, parent)


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def main():
    scene = bpy.context.scene
    clean_scene(scene)
    character = bpy.data.collections.new(PREFIX + "Character_茶タヌキ")
    studio = bpy.data.collections.new(PREFIX + "Studio_撮影用")
    scene.collection.children.link(character)
    scene.collection.children.link(studio)
    mats = {key: material(key) for key in COLORS}
    root = empty("Tanuki_茶タヌキ全体", character)
    root["説明"] = "各部のEmptyで位置・大きさを調整。前=-Y、上=Z。静止モデルのみ。"
    head = empty("Head_CTRL_頭全体", character, root, PARTS["head"][0], SETTINGS["head_scale"])
    box("Head_頭", (0,0,0), PARTS["head"][1], PARTS["head"][2], mats["fur"], character, head)
    face_pos = Vector(PARTS["face"][0])-Vector(PARTS["head"][0])
    fw, fd, fh = PARTS["face"][1]
    panel("FaceRim_顔の縁", face_pos + Vector((0,.032,0)), fw+.14, fh+.14, .11, .23,
          mats["rim"], character, head)
    panel("Face_黒い顔面", face_pos, fw, fh, fd, PARTS["face"][2], mats["screen"], character, head)
    for side, sign in [("L",-1),("R",1)]:
        panel("Eye_青い縦目_"+side, (sign*SETTINGS["eye_spacing"],-.873,-.035),
              .145,.43,.025,.065, mats["eye"], character, head)
        ear = empty("Ear_CTRL_耳_"+side, character, head, (sign*.71,.02,.79))
        ear.rotation_euler.y = math.radians(sign*-12)
        box("Ear_耳_"+side, (0,0,0), (.47,.40,.61), .12, mats["dark"], character, ear)
        panel("EarInner_耳の内側_"+side, (0,-.208,.015), .25,.34,.025,.06,
              mats["ear_inner"], character, ear)
    panel("Muzzle_白い口元", (0,-.887,-.35), .44,.30,.075,.12, mats["muzzle"], character, head)
    panel("Nose_小さな鼻", (0,-.931,-.29), .135,.078,.022,.032, mats["nose"], character, head)
    line("Mouth_口", [(0,-.947,-.32),(0,-.947,-.375),(-.072,-.947,-.404),(-.108,-.947,-.39)],
         .013,mats["nose"],character,head)
    line("Mouth_口_R", [(0,-.947,-.375),(.072,-.947,-.404),(.108,-.947,-.39)],
         .013,mats["nose"],character,head)
    leaf = empty("Leaf_CTRL_葉っぱ全体", character, head, (0,-.02,.785), SETTINGS["leaf_scale"])
    make_leaf(character,leaf,mats)
    body = empty("Body_CTRL_胴体全体",character,root,PARTS["body"][0],SETTINGS["body_scale"])
    box("Body_胴体",(0,0,0),PARTS["body"][1],PARTS["body"][2],mats["body"],character,body)
    bw,bd,bh = PARTS["belly"][1]
    panel("Belly_ベージュのお腹",Vector(PARTS["belly"][0])-Vector(PARTS["body"][0]),
          bw,bh,bd,PARTS["belly"][2],mats["cream"],character,body)
    for side, sign in [("L",-1),("R",1)]:
        arm = empty("Arm_CTRL_腕_"+side,character,root,(sign*.54,.02,1.27))
        arm.rotation_euler.y = math.radians(sign*-17)
        box("Arm_腕_"+side,(0,0,-.28),(.31,.36,.65),.085,mats["fur"],character,arm)
        box("Hand_手先_"+side,(0,-.012,-.59),(.32,.37,.28),.08,mats["dark"],character,arm)
        leg = empty("Leg_CTRL_脚_"+side,character,root,(sign*.30,.015,.34))
        box("Leg_脚_"+side,(0,0,-.06),(.35,.41,.35),.065,mats["body"],character,leg)
        box("Foot_足先_"+side,(0,-.10,-.22),(.42,.53,.24),.065,mats["dark"],character,leg)
    tail = empty("Tail_CTRL_尻尾全体",character,root,(0,.37,.57),SETTINGS["tail_scale"])
    make_tail(character,tail,mats)
    box("Ground_確認用の床",(0,0,-.09),(200,200,.16),0,mats["ground"],studio)
    cam_data = bpy.data.cameras.new(PREFIX+"Camera")
    cam = bpy.data.objects.new("Camera_確認用",cam_data)
    studio.objects.link(cam)
    cam.location = (5.2,-8.5,4.3)
    aim(cam,(0,.23,1.65))
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 4.65
    scene.camera = cam
    for name,loc,power,size in [("Key",(-3,-4,7),650,4),("Fill",(4,-1,5),400,4),("Rim",(1,4,6),550,3)]:
        data = bpy.data.lights.new(PREFIX+name,"AREA")
        data.energy = power
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name+"_照明",data)
        studio.objects.link(obj)
        obj.location = loc
        aim(obj,(0,0,1.5))
    world = bpy.data.worlds.get(PREFIX+"World") or bpy.data.worlds.new(PREFIX+"World")
    world.use_nodes = True
    world.node_tree.nodes.clear()
    bg = world.node_tree.nodes.new("ShaderNodeBackground")
    out = world.node_tree.nodes.new("ShaderNodeOutputWorld")
    bg.inputs["Color"].default_value = (.65,.72,.80,1)
    bg.inputs["Strength"].default_value = .35
    world.node_tree.links.new(bg.outputs[0],out.inputs["Surface"])
    scene.world = world
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = SETTINGS["render_size"]
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    for obj in scene.objects:
        obj.select_set(False)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                space = area.spaces.active
                space.shading.type = "MATERIAL"
                space.shading.use_scene_world = False
                space.shading.use_scene_lights = False
                space.overlay.show_floor = False
                space.overlay.show_extras = False
                space.region_3d.view_perspective = "CAMERA"
                space.region_3d.view_camera_zoom = 0
    bpy.context.view_layer.update()
    print("茶タヌキ試作1号を生成しました。テンキー0でカメラ、F12でレンダー。保存は手動です。")


if __name__ == "__main__":
    main()
