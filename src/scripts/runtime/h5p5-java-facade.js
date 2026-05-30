export const H5P5_JAVA_FILE_NAME = 'H5P5.java';

export const H5P5_STDOUT_MARKER = '__H5P5__';

export const H5P5_JAVA_SOURCE = `public final class H5P5 {
    private static final String MARKER = "__H5P5__";

    private H5P5() {
    }

    public static void size(int width, int height) {
        createCanvas(width, height);
    }

    public static void createCanvas(int width, int height) {
        emit("createCanvas", width + "|" + height);
    }

    public static void background(int gray) {
        emit("background", Integer.toString(gray));
    }

    public static void background(int r, int g, int b) {
        emit("background", r + "|" + g + "|" + b);
    }

    public static void fill(int gray) {
        emit("fill", Integer.toString(gray));
    }

    public static void fill(int r, int g, int b) {
        emit("fill", r + "|" + g + "|" + b);
    }

    public static void stroke(int gray) {
        emit("stroke", Integer.toString(gray));
    }

    public static void stroke(int r, int g, int b) {
        emit("stroke", r + "|" + g + "|" + b);
    }

    public static void strokeWeight(double weight) {
        emit("strokeWeight", Double.toString(weight));
    }

    public static void noStroke() {
        emit("noStroke", "");
    }

    public static void noFill() {
        emit("noFill", "");
    }

    public static void clear() {
        emit("clear", "");
    }

    public static void circle(double x, double y, double diameter) {
        emit("circle", x + "|" + y + "|" + diameter);
    }

    public static void ellipse(double x, double y, double width, double height) {
        emit("ellipse", x + "|" + y + "|" + width + "|" + height);
    }

    public static void rect(double x, double y, double width, double height) {
        emit("rect", x + "|" + y + "|" + width + "|" + height);
    }

    public static void line(double x1, double y1, double x2, double y2) {
        emit("line", x1 + "|" + y1 + "|" + x2 + "|" + y2);
    }

    public static void text(String text, double x, double y) {
        emit("text", sanitize(text) + "|" + x + "|" + y);
    }

    public static void textSize(double size) {
        emit("textSize", Double.toString(size));
    }

    public static void noLoop() {
        emit("noLoop", "");
    }

    public static void loop() {
        emit("loop", "");
    }

    private static String sanitize(String value) {
        return value == null ? "" : value.replace('|', ' ').replace('\\n', ' ').replace('\\r', ' ');
    }

    private static void emit(String name, String args) {
        if (args == null || args.length() == 0) {
            System.out.println(MARKER + "|" + name);
            return;
        }
        System.out.println(MARKER + "|" + name + "|" + args);
    }
}
`;

